# Headless Shopify Integration — Design Document

**Date:** 2026-05-11  
**Project:** FarmaPlus (`apps/web`)  
**Approach:** Raw Storefront API (Option A) — no hydrogen-react, no commerce template  
**Deployment:** Vercel  
**Store currency:** CRC (Costa Rican Colón)  
**UI language:** Spanish

---

## Constraints & Ground Rules

- All files scoped to `apps/web/` — monorepo root is off-limits unless explicitly stated
- Path alias: `@/*` → `src/*`
- Existing landing page, GSAP animations, and brand tokens are untouched
- `app/layout.tsx` stays a Server Component — no `'use client'` in layout
- GSAP pattern: raw `useEffect` + `gsap.context()` + `ctx.revert()` — no `useGSAP` hook
- No `generateStaticParams` — ISR on first request (500+ SKUs)
- Cart mutations: always `cache: 'no-store'`
- Single optimizer for images: `next/image` only — no Shopify CDN transform params

---

## Section 1 — Architecture Overview

### Directory Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx                    ← existing (import providers.tsx here)
│   ├── page.tsx                      ← existing landing page, untouched
│   ├── products/
│   │   ├── page.tsx                  ← ISR, revalidate: 3600
│   │   └── [handle]/
│   │       └── page.tsx              ← ISR, revalidate: 3600
│   ├── collections/
│   │   └── [handle]/
│   │       └── page.tsx              ← ISR, revalidate: 3600
│   ├── cart/
│   │   └── page.tsx                  ← force-dynamic
│   ├── search/
│   │   └── page.tsx                  ← force-dynamic
│   └── api/
│       └── revalidate/
│           └── route.ts              ← POST, Shopify webhook receiver
├── components/
│   ├── home/                         ← existing, untouched
│   └── shop/                         ← all new commerce components
├── lib/
│   ├── supabase/                     ← existing, untouched
│   └── shopify/
│       ├── client.ts
│       ├── types.ts
│       ├── helpers.ts
│       ├── currency.ts
│       ├── queries/
│       │   ├── product.ts
│       │   ├── collection.ts
│       │   └── search.ts
│       └── mutations/
│           └── cart.ts
└── middleware.ts                     ← cart cookie management
```

### Rendering Strategy

| Route | Strategy | Reason |
|---|---|---|
| `/products` | ISR `revalidate: 3600` | Webhook-busted on product change |
| `/products/[handle]` | ISR `revalidate: 3600` | Webhook-busted on product/inventory change |
| `/collections/[handle]` | ISR `revalidate: 3600` | Webhook-busted on collection change |
| `/cart` | `force-dynamic` | Per-user, never cacheable |
| `/search` | `force-dynamic` | Query-dependent, always fresh |
| `/api/revalidate` | N/A | Webhook receiver |

---

## Section 2 — Data Layer (`lib/shopify/`)

### `types.ts`

```ts
interface Money {
  amount: string
  currencyCode: string // always "CRC" from Storefront API
}

interface Image {
  url: string
  altText: string | null
  width: number
  height: number
}

interface ProductVariant {
  id: string
  title: string
  availableForSale: boolean
  quantityAvailable: number
  price: Money
  compareAtPrice: Money | null
  selectedOptions: { name: string; value: string }[]
}

interface Product {
  id: string
  title: string
  handle: string
  description: string
  descriptionHtml: string
  featuredImage: Image | null
  images: { nodes: Image[] }
  variants: { nodes: ProductVariant[] }
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money }
  productType: string
  tags: string[]
  availableForSale: boolean
}

interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  endCursor: string | null
  startCursor: string | null
}

interface ProductConnection {
  nodes: Product[]
  pageInfo: PageInfo
}

interface CartLine {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    product: Pick<Product, 'handle' | 'title' | 'featuredImage'>
    price: Money
  }
}

interface Cart {
  id: string
  checkoutUrl: string
  totalQuantity: number
  cost: {
    subtotalAmount: Money
    totalAmount: Money
    totalTaxAmount: Money | null
  }
  lines: { nodes: CartLine[] }
}
```

### `client.ts` — `shopifyFetch<T>()`

```ts
async function shopifyFetch<T>({
  query,
  variables,
  cache,
  tags,
}: {
  query: string
  variables?: Record<string, unknown>
  cache?: RequestCache
  tags?: string[]
}): Promise<{ data: T; errors?: { message: string }[] }>
```

- Reads `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_ACCESS_TOKEN` from env
- Throws on HTTP errors and on GraphQL `errors` in the response
- Passes `cache` and `tags` directly to `fetch()` — callers control caching
- Server-only — never imported from `'use client'` components

### `helpers.ts`

```ts
function formatPrice(money: Money): string
// CRC: "₡12.500" (period thousands separator, zero decimals)
// Throws if money.currencyCode !== 'CRC'

function isOnSale(variant: ProductVariant): boolean
// true if compareAtPrice exists and compareAtPrice.amount > price.amount

function getDefaultVariant(variants: ProductVariant[]): ProductVariant
// first availableForSale variant, fallback to first

function normalizeImageUrl(url: string): string
// returns clean Shopify CDN URL — no transform params
// next/image handles all resizing via width/height props

function variantToSearchParams(variant: ProductVariant): URLSearchParams
// builds ?variant=... URL params from selectedOptions

function normalizeSearchQuery(q: string): string
// strips accents: 'aspirína' → 'aspirina'
// q.normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
```

### `currency.ts` — `getVentaRate()` + `formatDualPrice()`

**Rate sources (priority order):**

1. `https://tipodecambio.paginasweb.cr/api` → JSON `{ venta: number }` → use `venta`
2. BCCR Web Service fallback → XML, indicator 318, regex parse `NUM_VALOR` field  
   Requires: `BCCR_EMAIL`, `BCCR_TOKEN` env vars
3. `FALLBACK_RATE = 520` — hardcoded, logs warning when used

**Cache:** module-level `{ rate: number, fetchedAt: number }`, TTL 6 hours.  
Note: cold starts on Vercel serverless reset the module-level cache — re-fetch on cold start is acceptable for exchange rates.

**Server-only** — never import from `'use client'` components.

```ts
async function getVentaRate(): Promise<number>
// returns CRC per 1 USD (venta rate)

function formatDualPrice(money: Money, rate: number): { crc: string; usd: string }
// Throws if money.currencyCode !== 'CRC'
// crc = amount formatted directly: "₡12.500"
// usd = parseFloat(amount) / rate formatted: "$24.04"
```

### Pagination (all collection + search queries)

```ts
// Variables — consistent shape across all paginated queries
{ first: 24, after: string | null }

// Response — consistent shape
{
  nodes: Product[],
  pageInfo: { hasNextPage: boolean, endCursor: string | null }
}
```

"Load More" passes `endCursor` as `after` on the next fetch. No offset pagination — Shopify does not support it.

### Cart mutations (`mutations/cart.ts`)

| Server Action | Shopify operation |
|---|---|
| `getCart(id)` | `query cart` |
| `createCart()` | `cartCreate` |
| `addToCart(cartId, lines)` | `cartLinesAdd` |
| `updateCartLine(cartId, lines)` | `cartLinesUpdate` |
| `removeCartLine(cartId, lineIds)` | `cartLinesRemove` |

All five use `cache: 'no-store'` internally.

### Required env vars

```bash
# Shopify
SHOPIFY_STORE_DOMAIN=           # yourstore.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=

# BCCR exchange rate fallback (optional — needed only if source 1 is down)
BCCR_EMAIL=
BCCR_TOKEN=
```

---

## Section 3 — Routing + Rendering

### Cache Tag Hierarchy (3 levels)

| Tag | Scope |
|---|---|
| `shopify-product-${handle}` | Single PDP |
| `shopify-products` | All collection + catalog pages |
| `shopify` | Nuclear — full bust, rarely used |

### Webhook mapping (`/api/revalidate`)

| Event | Tags busted |
|---|---|
| `inventory_levels/update` | `` `shopify-product-${handle}` `` |
| `products/update` | `` `shopify-product-${handle}` `` |
| `products/delete` | `` `shopify-product-${handle}` `` + `shopify-products` |
| `collections/update` | `shopify-products` |
| Manual bulk / store-wide sale | `shopify` (admin-triggered) |

Webhook route validates `X-Shopify-Hmac-Sha256` against `SHOPIFY_WEBHOOK_SECRET`. Returns 401 on unsigned requests.

### Search

- `force-dynamic`, no cache
- Query normalized via `normalizeSearchQuery()` before sending to Shopify
- Shopify params: `types: [PRODUCT]`, `prefix: LAST`
- `SearchBar` debounces 300ms, pushes to `/search?q=...` via `router.push`

---

## Section 4 — Cart Architecture

### State: React Context + `useReducer`

No Zustand — cart is the only shared client state. Replaceable with Zustand later if scope grows.

### CartContext shape

```ts
interface CartContextValue {
  cart: Cart | null
  cartStatus: 'idle' | 'loading' | 'error'
  error: string | null
  setError: (msg: string | null) => void
  addToCart: (variantId: string, quantity: number) => Promise<void>
  updateCartLine: (lineId: string, quantity: number) => Promise<void>
  removeCartLine: (lineId: string) => Promise<void>
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}
```

### Data flow

```
Cookie 'cartId' (HttpOnly, 7 days)
       ↓
Server Action: getCart(cartId)
       ↓
CartProvider hydrates context on mount (cartStatus: 'loading' → 'idle')
       ↓
CartDrawer + MiniCartButton + /cart page read from context
       ↓
Mutations → Server Actions → optimistic update → real response or rollback
```

### Cookie

```
Name:     cartId
HttpOnly: true
SameSite: Lax
Secure:   true (production)
Max-Age:  604800  (7 days)
Path:     /
```

Created lazily on first `addToCart` call if no cookie exists.

### Optimistic update pattern

1. Snapshot current cart state
2. Apply optimistic update immediately
3. Await Server Action result
4. **Success** → replace optimistic state with real Shopify response
5. **Failure** → rollback to snapshot + call `setError("No se pudo agregar al carrito. Intenta de nuevo.")`

Never leave optimistic state on screen after a failed mutation.

### GSAP — CartDrawer

```ts
// Consistent with statement-section.tsx pattern
useEffect(() => {
  const ctx = gsap.context(() => {
    if (isOpen) {
      gsap.to(drawerRef.current, { x: 0, duration: 0.4, ease: 'power3.out' })
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.3 })
    } else {
      gsap.to(drawerRef.current, { x: '100%', duration: 0.35, ease: 'power3.in' })
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3 })
    }
  })
  return () => ctx.revert()
}, [isOpen])

// Initial state set on mount (not CSS)
useEffect(() => {
  gsap.set(drawerRef.current, { x: '100%' })
  gsap.set(overlayRef.current, { opacity: 0 })
}, [])
```

---

## Section 5 — Component Map

All components under `components/shop/`. None touch `components/home/`.

### Product UI

| Component | Notes |
|---|---|
| `ProductCard` | Image, title, dual price, ATC CTA. `loading="lazy"` default. |
| `ProductCardSkeleton` | Matches `ProductCard` dimensions. CSS shimmer. No props. Used in `<ProductGridSkeleton count={24} />`. |
| `ProductGrid` | Server Component. Responsive 2→4 col grid. "Load More" button passes `endCursor`. First 4 cards: `priority={true}`. |
| `ProductDetail` | Full PDP layout. Composes gallery, variant selector, quantity stepper, ATC button. |
| `VariantSelector` | Swatches. Unavailable = grayed + `title="Sin stock"`. Selection reflected in `?variant=...` URL param. |
| `PriceDisplay` | `formatDualPrice()` output. Strikethrough compareAtPrice + "Oferta" badge if `isOnSale()`. |
| `ProductImageGallery` | Thumbnail strip + main image. GSAP crossfade on thumbnail click. `featuredImage`: `priority={true}`. Thumbnails: `loading="lazy"`. |
| `AddToCartButton` | States: idle / loading / added. GSAP scale pulse on "added" (scale 1.08→1, 0.3s). Resets after 1.5s. |

### Cart UI

| Component | Notes |
|---|---|
| `CartDrawer` | GSAP slide-in. Reads `isOpen`/`closeCart` from context. Contains `CartLineList` + `CartSummary`. |
| `CartLineList` | Maps `cart.lines.nodes` → `CartItem`. Client component. |
| `CartItem` | Image, name, variant, `QuantityStepper`, remove button, line price. |
| `CartSummary` | Subtotal CRC + USD. "Ir al pago" → `window.location.href = cart.checkoutUrl`. |
| `MiniCartButton` | Bag icon. Count badge from `cart.totalQuantity`. Skeleton circle when `cartStatus === 'loading'`. |
| `QuantityStepper` | Controlled +/−. Props: `value`, `min` (default 1), `max` (quantityAvailable), `onChange`. Disables at bounds. Used in `CartItem` and `ProductDetail`. |

### Navigation & UX

| Component | Notes |
|---|---|
| `CollectionNav` | Horizontal scrollable filter bar. Active tab in `?collection=handle` URL param. `scrollbar-hide` on mobile. |
| `CollectionNavSkeleton` | 4–5 pill shimmer placeholders. Suspense fallback for `CollectionNav`. |
| `SearchBar` | Controlled input, 300ms debounce, `normalizeSearchQuery()`, `router.push('/search?q=...')`. |
| `Breadcrumbs` | Inicio → Productos → [title]. Server Component. |
| `ErrorToast` | Single instance in `providers.tsx`. Reads `error` from CartContext. Auto-dismisses after 4s via `setError(null)`. |

### Providers

| Component | Notes |
|---|---|
| `providers.tsx` | `'use client'` boundary. Wraps `CartProvider`. Single `<ErrorToast />` outlet. Imported into `app/layout.tsx`. |
| `CartProvider` | Holds CartContext + useReducer. Hydrates from cookie on mount. |

### Suspense boundaries

| Boundary | Fallback |
|---|---|
| `ProductGrid` | `<ProductGridSkeleton count={24} />` |
| `ProductDetail` | Full-page skeleton |
| `CollectionNav` | `<CollectionNavSkeleton />` |
| `CartDrawer` inner | Spinner |

---

## Section 6 — Performance + GSAP

### `next/image` configuration

```ts
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '**.myshopify.com' },
    { protocol: 'https', hostname: 'cdn.shopify.com' },
  ]
}
```

`normalizeImageUrl()` returns the clean CDN URL — no `?width=` params. `next/image` handles all resizing via `width`/`height` props. One optimizer only.

### LCP priority

- `/products`: first 4 `ProductCard` components → `priority={true}`
- `/products/[handle]`: `featuredImage` in `ProductImageGallery` → `priority={true}`
- All other product images: `loading="lazy"` (default)

### GSAP — new animations

All follow the existing `statement-section.tsx` pattern (`useEffect` + `gsap.context()` + `ctx.revert()`). No `useGSAP` hook. No new plugins — core GSAP only.

| Component | Animation |
|---|---|
| `CartDrawer` | Slide in/out (`x: '100%' → 0`), overlay fade |
| `ProductImageGallery` | Crossfade on thumbnail click |
| `AddToCartButton` | Scale pulse on "added" state |

`ScrollTrigger` remains registered only in `statement-section.tsx`. Scoped via `gsap.context()` — no conflict risk.

### Caching rules summary

- All product/collection reads: `tags: ['shopify-product-${handle}']` or `tags: ['shopify-products']`
- All cart mutations: `cache: 'no-store'`
- Search: `cache: 'no-store'`
- Exchange rate: module-level, 6h TTL, server-only

---

## Implementation Order

```
[ ] 1.  Shopify store setup + Storefront API access token + env vars
[ ] 2.  next.config.ts — image domains
[ ] 3.  lib/shopify/types.ts
[ ] 4.  lib/shopify/client.ts — shopifyFetch()
[ ] 5.  lib/shopify/helpers.ts — formatPrice, isOnSale, getDefaultVariant,
         normalizeImageUrl, variantToSearchParams, normalizeSearchQuery
[ ] 6.  lib/shopify/currency.ts — getVentaRate(), formatDualPrice()
[ ] 7.  lib/shopify/queries/product.ts
[ ] 8.  lib/shopify/queries/collection.ts
[ ] 9.  lib/shopify/queries/search.ts
[ ] 10. lib/shopify/mutations/cart.ts
[ ] 11. CartContext + CartProvider + providers.tsx + ErrorToast  ← must precede shared components
[ ] 12. middleware.ts — cart cookie (passthrough stub)
[ ] 13. Shared components: QuantityStepper, Breadcrumbs, MiniCartButton + header wiring
[ ] 14. app/products/page.tsx + ProductGrid + ProductCard + ProductCardSkeleton
[ ] 15. app/products/[handle]/page.tsx + PriceDisplay + VariantSelector +
         ProductImageGallery + QuantityAndCart + AddToCartButton
[ ] 16. CartDrawer + CartItem + CartLineList + CartSummary
[ ] 17. app/cart/page.tsx + CartPageClient
[ ] 18. app/search/page.tsx + SearchBar
[ ] 19. app/collections/[handle]/page.tsx + CollectionNav + CollectionNavSkeleton
[ ] 20. app/api/revalidate/route.ts — webhook + HMAC + revalidateTag
[ ] 21. Suspense boundaries + skeleton loaders audit
[ ] 22. Core Web Vitals + bundle size audit
```
