# Headless Shopify Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Shopify Storefront API into the existing FarmaPlus Next.js site, adding a full e-commerce layer (product catalog, PDPs, cart, search) without touching the existing landing page.

**Architecture:** Raw Storefront API via a typed `shopifyFetch()` wrapper in `lib/shopify/`. Server Components for all data fetching, Server Actions for cart mutations, React Context for cart state. ISR with 3-tier cache tag hierarchy; on-demand busting via Shopify webhooks.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS v3, GSAP v3 (core only, no new plugins), Shopify Storefront API 2025-01, Vercel deployment.

---

## Ground Rules (read before touching any file)

- **All files in `apps/web/`** — monorepo root is off-limits
- **Imports always use `@/*`** → resolves to `src/*` (tsconfig path alias)
- **GSAP pattern:** `useEffect` + `gsap.context()` + `ctx.revert()` — never `useGSAP` hook
- **Images:** `next/image` only, no Shopify CDN `?width=` params in URLs
- **Cache:** product reads use `tags:`, cart mutations always `cache: 'no-store'`
- **`app/layout.tsx` stays a Server Component** — client boundary goes in `providers.tsx`
- **Verification after every task:** `cd apps/web && npx tsc --noEmit` must pass with 0 errors

---

## Task 1: Shopify Store Setup + Env Vars

**Files:**
- Modify: `apps/web/.env.example`
- Create: `apps/web/.env.local` (gitignored — never commit)

**Step 1: Create a Shopify store**

Go to shopify.com → Start free trial → choose "Starter" plan (sufficient for headless).
Store name: `farmaplus` (or similar). Country: Costa Rica. Currency: **CRC**.

**Step 2: Create the Storefront API access token**

In Shopify Admin → Settings → Apps and sales channels → Develop apps → Create an app → name it `FarmaPlus Headless`.

Under "API credentials" tab → Configure Storefront API scopes. Enable:
- `unauthenticated_read_product_listings`
- `unauthenticated_read_product_inventory`
- `unauthenticated_read_collection_listings`
- `unauthenticated_write_checkouts`
- `unauthenticated_read_checkouts`
- `unauthenticated_write_customers` (for cart)
- `unauthenticated_read_customer_tags`

Click "Save" then "Install app". Copy the **Storefront API access token**.

**Step 3: Add env vars to `.env.example`**

```bash
# Shopify Storefront API
SHOPIFY_STORE_DOMAIN=           # yourstore.myshopify.com (no https://)
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=         # set after creating webhook in Task 20

# BCCR exchange rate fallback (register free at gee.bccr.fi.cr)
BCCR_EMAIL=
BCCR_TOKEN=
```

**Step 4: Populate `.env.local`**

```bash
SHOPIFY_STORE_DOMAIN=farmaplus.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_token_here
SHOPIFY_WEBHOOK_SECRET=placeholder_set_in_task_20
BCCR_EMAIL=your@email.com
BCCR_TOKEN=your_bccr_token
```

**Step 5: Commit `.env.example` update only**

```bash
git add apps/web/.env.example
git commit -m "feat: add Shopify and BCCR env var declarations"
```

---

## Task 2: next.config.ts — Image Domains

**Files:**
- Modify: `apps/web/next.config.ts`

**Step 1: Update config**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.myshopify.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "feat: whitelist Shopify CDN domains for next/image"
```

---

## Task 3: `lib/shopify/types.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/types.ts`

**Step 1: Write the file**

```ts
export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable: number;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: { name: string; value: string }[];
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  featuredImage: ShopifyImage | null;
  images: { nodes: ShopifyImage[] };
  variants: { nodes: ProductVariant[] };
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  productType: string;
  tags: string[];
  availableForSale: boolean;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string | null;
  startCursor: string | null;
}

export interface ProductConnection {
  nodes: Product[];
  pageInfo: PageInfo;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
}

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: Pick<Product, "handle" | "title" | "featuredImage">;
    price: Money;
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
  lines: { nodes: CartLine[] };
}

// GraphQL response envelope
export interface ShopifyResponse<T> {
  data: T;
  errors?: { message: string }[];
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/types.ts
git commit -m "feat: add Shopify TypeScript types"
```

---

## Task 4: `lib/shopify/client.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/client.ts`

**Step 1: Write the file**

```ts
import type { ShopifyResponse } from "./types";

const SHOPIFY_API_VERSION = "2025-01";

export async function shopifyFetch<T>({
  query,
  variables,
  cache = "force-cache",
  tags,
  revalidate,
}: {
  query: string;
  variables?: Record<string, unknown>;
  cache?: RequestCache;
  tags?: string[];
  revalidate?: number;
}): Promise<ShopifyResponse<T>> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !token) {
    throw new Error(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_ACCESS_TOKEN"
    );
  }

  const endpoint = `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache,
    ...(tags || revalidate !== undefined
      ? {
          next: {
            ...(tags && { tags }),
            ...(revalidate !== undefined && { revalidate }),
          },
        }
      : {}),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText}`
    );
  }

  const json = (await response.json()) as ShopifyResponse<T>;

  if (json.errors?.length) {
    throw new Error(
      `Shopify GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`
    );
  }

  return json;
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/client.ts
git commit -m "feat: add shopifyFetch typed GraphQL client"
```

---

## Task 5: `lib/shopify/helpers.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/helpers.ts`

**Step 1: Write the file**

```ts
import type { Money, ProductVariant } from "./types";

export function formatPrice(money: Money): string {
  if (money.currencyCode !== "CRC") {
    throw new Error(
      `formatPrice: expected CRC, got ${money.currencyCode}`
    );
  }
  const amount = parseFloat(money.amount);
  // Period as thousands separator, zero decimals: ₡12.500
  return "₡" + Math.round(amount).toLocaleString("de-DE");
}

export function isOnSale(variant: ProductVariant): boolean {
  if (!variant.compareAtPrice) return false;
  return (
    parseFloat(variant.compareAtPrice.amount) >
    parseFloat(variant.price.amount)
  );
}

export function getDefaultVariant(
  variants: ProductVariant[]
): ProductVariant {
  return variants.find((v) => v.availableForSale) ?? variants[0]!;
}

export function normalizeImageUrl(url: string): string {
  // Return clean CDN URL — next/image handles sizing via width/height props
  // Strip any existing Shopify CDN transform params
  try {
    const u = new URL(url);
    // Remove v= versioning and size params Shopify sometimes appends
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

export function variantToSearchParams(
  variant: ProductVariant
): URLSearchParams {
  const params = new URLSearchParams();
  for (const opt of variant.selectedOptions) {
    params.set(opt.name, opt.value);
  }
  return params;
}

export function normalizeSearchQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/helpers.ts
git commit -m "feat: add Shopify helper utilities"
```

---

## Task 6: `lib/shopify/currency.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/currency.ts`

**Step 1: Write the file**

```ts
import type { Money } from "./types";

const FALLBACK_RATE = 520;
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

let rateCache: { rate: number; fetchedAt: number } | null = null;

async function fetchFromPaginasweb(): Promise<number> {
  const res = await fetch("https://tipodecambio.paginasweb.cr/api", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("paginasweb fetch failed");
  const json = (await res.json()) as { venta: number };
  if (typeof json.venta !== "number") throw new Error("paginasweb bad shape");
  return json.venta;
}

async function fetchFromBCCR(): Promise<number> {
  const email = process.env.BCCR_EMAIL;
  const token = process.env.BCCR_TOKEN;
  if (!email || !token) throw new Error("BCCR credentials not configured");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const url =
    `https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/` +
    `wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicos` +
    `?Indicador=318&FechaInicio=${today}&FechaFinal=${today}` +
    `&Nombre=FarmaPlus&SubNiveles=N&CorreoElectronico=${email}&Token=${token}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("BCCR fetch failed");
  const xml = await res.text();

  const match = xml.match(/<NUM_VALOR>([\d,\.]+)<\/NUM_VALOR>/);
  if (!match?.[1]) throw new Error("BCCR XML parse failed");

  const rate = parseFloat(match[1].replace(",", "."));
  if (isNaN(rate) || rate <= 0) throw new Error("BCCR invalid rate");
  return rate;
}

export async function getVentaRate(): Promise<number> {
  const now = Date.now();

  if (rateCache && now - rateCache.fetchedAt < TTL_MS) {
    return rateCache.rate;
  }

  let rate: number;

  try {
    rate = await fetchFromPaginasweb();
  } catch (err) {
    console.warn("[currency] paginasweb failed, trying BCCR:", err);
    try {
      rate = await fetchFromBCCR();
    } catch (err2) {
      console.warn("[currency] BCCR failed, using fallback rate:", err2);
      rate = FALLBACK_RATE;
    }
  }

  rateCache = { rate, fetchedAt: now };
  return rate;
}

export function formatDualPrice(
  money: Money,
  rate: number
): { crc: string; usd: string } {
  if (money.currencyCode !== "CRC") {
    throw new Error(
      `formatDualPrice: expected CRC, got ${money.currencyCode}`
    );
  }

  const crcAmount = Math.round(parseFloat(money.amount));
  const usdAmount = parseFloat(money.amount) / rate;

  // CRC: period thousands separator, ₡ prefix, zero decimals
  const crc = "₡" + crcAmount.toLocaleString("de-DE");
  // USD: comma thousands separator, $ prefix, 2 decimals
  const usd = "$" + usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return { crc, usd };
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/currency.ts
git commit -m "feat: add CRC/USD exchange rate fetcher with 3-tier fallback"
```

---

## Task 7: `lib/shopify/queries/product.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/queries/product.ts`

**Step 1: Write the file**

```ts
import { shopifyFetch } from "../client";
import type { Product } from "../types";

const PRODUCT_FRAGMENT = `
  id
  title
  handle
  description
  descriptionHtml
  availableForSale
  productType
  tags
  featuredImage { url altText width height }
  images(first: 10) {
    nodes { url altText width height }
  }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      quantityAvailable
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      selectedOptions { name value }
    }
  }
  priceRange {
    minVariantPrice { amount currencyCode }
    maxVariantPrice { amount currencyCode }
  }
`;

const GET_PRODUCT_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      ${PRODUCT_FRAGMENT}
    }
  }
`;

const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        handle
        availableForSale
        productType
        featuredImage { url altText width height }
        priceRange {
          minVariantPrice { amount currencyCode }
        }
        variants(first: 1) {
          nodes {
            id
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getProduct(handle: string): Promise<Product | null> {
  const { data } = await shopifyFetch<{ product: Product | null }>({
    query: GET_PRODUCT_QUERY,
    variables: { handle },
    tags: [`shopify-product-${handle}`],
  });
  return data.product;
}

export async function getProducts({
  first = 24,
  after = null,
}: {
  first?: number;
  after?: string | null;
} = {}): Promise<{
  nodes: Product[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}> {
  const { data } = await shopifyFetch<{
    products: {
      nodes: Product[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>({
    query: GET_PRODUCTS_QUERY,
    variables: { first, after },
    tags: ["shopify-products"],
  });
  return data.products;
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/queries/product.ts
git commit -m "feat: add Shopify product GraphQL queries"
```

---

## Task 8: `lib/shopify/queries/collection.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/queries/collection.ts`

**Step 1: Write the file**

```ts
import { shopifyFetch } from "../client";
import type { Product, ShopifyCollection } from "../types";

const GET_COLLECTION_QUERY = `
  query GetCollection($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      products(first: $first, after: $after) {
        nodes {
          id
          title
          handle
          availableForSale
          productType
          featuredImage { url altText width height }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          variants(first: 1) {
            nodes {
              id
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!) {
    collections(first: $first) {
      nodes {
        id
        title
        handle
        description
      }
    }
  }
`;

export async function getCollection(
  handle: string,
  { first = 24, after = null }: { first?: number; after?: string | null } = {}
): Promise<{
  collection: ShopifyCollection;
  products: {
    nodes: Product[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
} | null> {
  const { data } = await shopifyFetch<{
    collection:
      | (ShopifyCollection & {
          products: {
            nodes: Product[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        })
      | null;
  }>({
    query: GET_COLLECTION_QUERY,
    variables: { handle, first, after },
    tags: ["shopify-products", `shopify-collection-${handle}`],
  });

  if (!data.collection) return null;

  const { products, ...collection } = data.collection;
  return { collection, products };
}

export async function getCollections(
  first = 50
): Promise<ShopifyCollection[]> {
  const { data } = await shopifyFetch<{
    collections: { nodes: ShopifyCollection[] };
  }>({
    query: GET_COLLECTIONS_QUERY,
    variables: { first },
    tags: ["shopify-products"],
  });
  return data.collections.nodes;
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/queries/collection.ts
git commit -m "feat: add Shopify collection GraphQL queries"
```

---

## Task 9: `lib/shopify/queries/search.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/queries/search.ts`

**Step 1: Write the file**

```ts
import { shopifyFetch } from "../client";
import { normalizeSearchQuery } from "../helpers";
import type { Product } from "../types";

const SEARCH_QUERY = `
  query SearchProducts($query: String!, $first: Int!, $after: String) {
    search(
      query: $query
      first: $first
      after: $after
      types: PRODUCT
      prefix: LAST
    ) {
      nodes {
        ... on Product {
          id
          title
          handle
          availableForSale
          productType
          featuredImage { url altText width height }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          variants(first: 1) {
            nodes {
              id
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function searchProducts(
  rawQuery: string,
  { first = 24, after = null }: { first?: number; after?: string | null } = {}
): Promise<{
  nodes: Product[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}> {
  const query = normalizeSearchQuery(rawQuery);

  const { data } = await shopifyFetch<{
    search: {
      nodes: Product[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>({
    query: SEARCH_QUERY,
    variables: { query, first, after },
    cache: "no-store",
  });

  return data.search;
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/lib/shopify/queries/search.ts
git commit -m "feat: add Shopify search query with accent normalization"
```

---

## Task 10: `lib/shopify/mutations/cart.ts` + `cart-actions.ts`

**Files:**
- Create: `apps/web/src/lib/shopify/mutations/cart.ts` — `getCart` only, no directive
- Create: `apps/web/src/lib/shopify/mutations/cart-actions.ts` — `"use server"` at file top, all mutations

**Why two files:** Inline `"use server"` inside a function body is only valid if the enclosing file also has the file-level directive. Without the file-level directive it is silently ignored — mutations appear to run but are never registered as Server Actions and cannot be called from the client. The clean split is: query in one file, actions in another.

**Step 1: Write `cart.ts`** (query only — no directive)

The shared `CART_FRAGMENT` lives here and is exported so `cart-actions.ts` can import it without duplication.

```ts
import { shopifyFetch } from "../client";
import type { Cart } from "../types";

export const CART_FRAGMENT = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
  }
  lines(first: 100) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          price { amount currencyCode }
          product {
            handle
            title
            featuredImage { url altText width height }
          }
        }
      }
    }
  }
`;

const GET_CART_QUERY = `
  query GetCart($id: ID!) {
    cart(id: $id) { ${CART_FRAGMENT} }
  }
`;

// No "use server" — called from layout.tsx (Server Component) to hydrate CartProvider
export async function getCart(id: string): Promise<Cart | null> {
  const { data } = await shopifyFetch<{ cart: Cart | null }>({
    query: GET_CART_QUERY,
    variables: { id },
    cache: "no-store",
  });
  return data.cart;
}
```

**Step 2: Write `cart-actions.ts`** (`"use server"` at file top — required for Server Action registration)

```ts
"use server";

import { cookies } from "next/headers";
import { shopifyFetch } from "../client";
import { CART_FRAGMENT } from "./cart";
import type { Cart } from "../types";

const CREATE_CART_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

const ADD_LINES_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

const UPDATE_LINES_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

const REMOVE_LINES_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

type UserError = { field: string[]; message: string };

function assertNoUserErrors(userErrors: UserError[]): void {
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join(", "));
  }
}

async function setCartCookie(cartId: string): Promise<void> {
  (await cookies()).set("cartId", cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function createCart(): Promise<Cart> {
  const { data } = await shopifyFetch<{
    cartCreate: { cart: Cart; userErrors: UserError[] };
  }>({
    query: CREATE_CART_MUTATION,
    variables: { input: {} },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartCreate.userErrors);
  await setCartCookie(data.cartCreate.cart.id);
  return data.cartCreate.cart;
}

export async function addToCart(
  variantId: string,
  quantity: number
): Promise<Cart> {
  const cookieStore = await cookies();
  let cartId = cookieStore.get("cartId")?.value;

  if (!cartId) {
    const newCart = await createCart();
    cartId = newCart.id;
  }

  const { data } = await shopifyFetch<{
    cartLinesAdd: { cart: Cart; userErrors: UserError[] };
  }>({
    query: ADD_LINES_MUTATION,
    variables: { cartId, lines: [{ merchandiseId: variantId, quantity }] },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartLinesAdd.userErrors);
  return data.cartLinesAdd.cart;
}

export async function updateCartLine(
  lineId: string,
  quantity: number
): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) throw new Error("No cart found");

  const { data } = await shopifyFetch<{
    cartLinesUpdate: { cart: Cart; userErrors: UserError[] };
  }>({
    query: UPDATE_LINES_MUTATION,
    variables: { cartId, lines: [{ id: lineId, quantity }] },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartLinesUpdate.userErrors);
  return data.cartLinesUpdate.cart;
}

export async function removeCartLine(lineId: string): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) throw new Error("No cart found");

  const { data } = await shopifyFetch<{
    cartLinesRemove: { cart: Cart; userErrors: UserError[] };
  }>({
    query: REMOVE_LINES_MUTATION,
    variables: { cartId, lineIds: [lineId] },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartLinesRemove.userErrors);
  return data.cartLinesRemove.cart;
}
```

**Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add apps/web/src/lib/shopify/mutations/cart.ts \
        apps/web/src/lib/shopify/mutations/cart-actions.ts
git commit -m "feat: add Shopify cart query (cart.ts) and Server Actions (cart-actions.ts)"
```

---

## Task 11: CartContext + CartProvider + providers.tsx + ErrorToast

**Files:**
- Create: `apps/web/src/components/shop/cart-context.tsx`
- Create: `apps/web/src/components/shop/error-toast.tsx`
- Create: `apps/web/src/components/shop/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Create `cart-context.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import type { Cart } from "@/lib/shopify/types";
import { getCart } from "@/lib/shopify/mutations/cart";
import {
  addToCart,
  removeCartLine,
  updateCartLine,
} from "@/lib/shopify/mutations/cart-actions";

interface CartState {
  cart: Cart | null;
  cartStatus: "idle" | "loading" | "error";
  error: string | null;
  isOpen: boolean;
}

type CartAction =
  | { type: "SET_LOADING" }
  | { type: "SET_CART"; cart: Cart }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, cartStatus: "loading" };
    case "SET_CART":
      return { ...state, cart: action.cart, cartStatus: "idle", error: null };
    case "SET_ERROR":
      return { ...state, error: action.error, cartStatus: "idle" };
    case "OPEN_CART":
      return { ...state, isOpen: true };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

interface CartContextValue {
  cart: Cart | null;
  cartStatus: "idle" | "loading" | "error";
  error: string | null;
  setError: (msg: string | null) => void;
  addToCart: (variantId: string, quantity: number) => Promise<void>;
  updateCartLine: (lineId: string, quantity: number) => Promise<void>;
  removeCartLine: (lineId: string) => Promise<void>;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    cart: null,
    cartStatus: "loading",
    error: null,
    isOpen: false,
  });

  // Hydrate cart on mount if cookie exists
  useEffect(() => {
    const cartId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cartId="))
      ?.split("=")[1];

    if (!cartId) {
      dispatch({ type: "SET_ERROR", error: null });
      return;
    }

    getCart(cartId)
      .then((cart) => {
        if (cart) {
          dispatch({ type: "SET_CART", cart });
        } else {
          dispatch({ type: "SET_ERROR", error: null });
        }
      })
      .catch(() => dispatch({ type: "SET_ERROR", error: null }));
  }, []);

  const snapshotRef = useRef<Cart | null>(null);

  const handleAddToCart = useCallback(
    async (variantId: string, quantity: number) => {
      snapshotRef.current = state.cart;
      try {
        const updatedCart = await addToCart(variantId, quantity);
        dispatch({ type: "SET_CART", cart: updatedCart });
        dispatch({ type: "OPEN_CART" });
      } catch {
        dispatch({ type: "SET_CART", cart: snapshotRef.current! });
        dispatch({
          type: "SET_ERROR",
          error: "No se pudo agregar al carrito. Intenta de nuevo.",
        });
      }
    },
    [state.cart]
  );

  const handleUpdateCartLine = useCallback(
    async (lineId: string, quantity: number) => {
      snapshotRef.current = state.cart;
      try {
        const updatedCart = await updateCartLine(lineId, quantity);
        dispatch({ type: "SET_CART", cart: updatedCart });
      } catch {
        dispatch({ type: "SET_CART", cart: snapshotRef.current! });
        dispatch({
          type: "SET_ERROR",
          error: "No se pudo actualizar el carrito. Intenta de nuevo.",
        });
      }
    },
    [state.cart]
  );

  const handleRemoveCartLine = useCallback(
    async (lineId: string) => {
      snapshotRef.current = state.cart;
      try {
        const updatedCart = await removeCartLine(lineId);
        dispatch({ type: "SET_CART", cart: updatedCart });
      } catch {
        dispatch({ type: "SET_CART", cart: snapshotRef.current! });
        dispatch({
          type: "SET_ERROR",
          error: "No se pudo eliminar el producto. Intenta de nuevo.",
        });
      }
    },
    [state.cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart: state.cart,
        cartStatus: state.cartStatus,
        error: state.error,
        setError: (msg) => dispatch({ type: "SET_ERROR", error: msg }),
        addToCart: handleAddToCart,
        updateCartLine: handleUpdateCartLine,
        removeCartLine: handleRemoveCartLine,
        isOpen: state.isOpen,
        openCart: () => dispatch({ type: "OPEN_CART" }),
        closeCart: () => dispatch({ type: "CLOSE_CART" }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
```

**Step 2: Create `error-toast.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";

export function ErrorToast() {
  const { error, setError } = useCart();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error, setError]);

  if (!error) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-5 py-3 text-sm text-white shadow-lg"
    >
      {error}
    </div>
  );
}
```

**Step 3: Create `providers.tsx`**

`Providers` accepts `cartId` as a prop (read server-side in `layout.tsx`) and forwards it to `CartProvider`. This is required because the `cartId` cookie is HttpOnly — it is invisible to `document.cookie` in the browser.

```tsx
"use client";

import { CartProvider } from "./cart-context";
import { ErrorToast } from "./error-toast";

export function Providers({
  children,
  cartId,
}: {
  children: React.ReactNode;
  cartId: string | undefined;
}) {
  return (
    <CartProvider cartId={cartId}>
      {children}
      <ErrorToast />
    </CartProvider>
  );
}
```

**Step 4: Update `cart-context.tsx` to accept `cartId` prop**

Replace the `document.cookie` hydration logic with a prop-based approach:

```tsx
// CartProvider now accepts cartId as a prop
export function CartProvider({
  children,
  cartId,
}: {
  children: React.ReactNode;
  cartId: string | undefined;
}) {
  const [state, dispatch] = useReducer(cartReducer, {
    cart: null,
    cartStatus: cartId ? "loading" : "idle", // skip loading if no cart exists
    error: null,
    isOpen: false,
  });

  // Hydrate cart on mount using the server-provided cartId
  useEffect(() => {
    if (!cartId) return;

    getCart(cartId)
      .then((cart) => {
        if (cart) {
          dispatch({ type: "SET_CART", cart });
        } else {
          // Stale cookie — cart expired on Shopify's end (~30 days inactivity).
          // Clear it so the next addToCart creates a fresh cart instead of
          // silently attempting to mutate a non-existent cart ID.
          document.cookie = "cartId=; Max-Age=0; path=/";
          dispatch({ type: "SET_ERROR", error: null });
        }
      })
      .catch(() => dispatch({ type: "SET_ERROR", error: null }));
  }, [cartId]);

  // ... rest of provider unchanged
```

**Step 5: Update `app/layout.tsx`**

`layout.tsx` remains a Server Component. It reads the cookie via `cookies()` from `next/headers` and passes `cartId` to `<Providers>`.

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/shop/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FarmaPlus",
  description: "FarmaPlus web application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cartId = (await cookies()).get("cartId")?.value;

  return (
    <html lang="es">
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <Providers cartId={cartId}>{children}</Providers>
      </body>
    </html>
  );
}
```

Note: `lang` changed from `"en"` to `"es"` — the UI is in Spanish. `RootLayout` becomes `async` to await `cookies()`.

**Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add apps/web/src/components/shop/cart-context.tsx \
        apps/web/src/components/shop/error-toast.tsx \
        apps/web/src/components/shop/providers.tsx \
        apps/web/src/app/layout.tsx
git commit -m "feat: add CartContext, CartProvider, ErrorToast, and Providers wrapper"
```

---

## Task 12: `src/middleware.ts` — Cart Cookie (read-only passthrough)

**Files:**
- Create: `apps/web/src/middleware.ts`

Note: The cart cookie is **written** by the `createCart()` Server Action (Task 10). Middleware here only reads the cookie for request inspection — useful for future auth gating of `/cart`. Keep it minimal for now.

**Step 1: Write the file**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  return NextResponse.next();
}

// Only run middleware on shop routes — not on the landing page or static assets
export const config = {
  matcher: ["/products/:path*", "/collections/:path*", "/cart", "/search"],
};
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add middleware stub scoped to shop routes"
```

---

## Task 13: Shared Shop Components (QuantityStepper, Breadcrumbs, MiniCartButton)

**Files:**
- Create: `apps/web/src/components/shop/quantity-stepper.tsx`
- Create: `apps/web/src/components/shop/breadcrumbs.tsx`
- Create: `apps/web/src/components/shop/mini-cart-button.tsx`

**Step 1: Create `quantity-stepper.tsx`**

```tsx
"use client";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#e0ddcf]/30 px-3 py-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Reducir cantidad"
        className="flex h-6 w-6 items-center justify-center text-[#e0ddcf] disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-sm text-[#e0ddcf]">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
        className="flex h-6 w-6 items-center justify-center text-[#e0ddcf] disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
```

**Step 2: Create `breadcrumbs.tsx`**

```tsx
import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#e0ddcf]/60">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-[#e0ddcf]">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-[#e0ddcf]">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

**Step 3: Create `mini-cart-button.tsx`**

```tsx
"use client";

import { useCart } from "./cart-context";

export function MiniCartButton() {
  const { cart, cartStatus, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Abrir carrito"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60"
    >
      {/* Bag icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>

      {/* Loading skeleton */}
      {cartStatus === "loading" && (
        <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-[#e0ddcf]/30" />
      )}

      {/* Count badge */}
      {cartStatus === "idle" && cart && cart.totalQuantity > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#408733] text-[10px] font-medium text-white">
          {cart.totalQuantity > 99 ? "99+" : cart.totalQuantity}
        </span>
      )}
    </button>
  );
}
```

**Step 4: Add `MiniCartButton` to the existing `Header`**

Open `apps/web/src/components/home/header.tsx` and add `MiniCartButton` alongside the existing WhatsApp button:

```tsx
import Image from "next/image";
import { HEADER_LOGO_SRC } from "./constants";
import { WhatsAppButton } from "./whatsapp-button";
import { MiniCartButton } from "@/components/shop/mini-cart-button";

export function Header() {
  return (
    <header className="sticky top-0 z-20 px-6 py-4 md:px-10">
      <div className="mx-auto flex w-full max-w-[1728px] items-center justify-between">
        <Image
          src={HEADER_LOGO_SRC}
          alt="FarmaPlus"
          width={167}
          height={22}
          className="h-auto w-[130px] md:w-[167px] backdrop-blur p-4"
          priority
        />
        <div className="flex items-center gap-2">
          <WhatsAppButton className="rounded-full border border-[#e0ddcf] hover:border-[#e0ddcf]/60 backdrop-blur px-4 py-2 text-sm text-[#e0ddcf] md:px-[13px] md:py-4 md:text-[20px] md:leading-[26px]">
            Contacto
          </WhatsAppButton>
          <MiniCartButton />
        </div>
      </div>
    </header>
  );
}
```

**Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add apps/web/src/components/shop/quantity-stepper.tsx \
        apps/web/src/components/shop/breadcrumbs.tsx \
        apps/web/src/components/shop/mini-cart-button.tsx \
        apps/web/src/components/home/header.tsx
git commit -m "feat: add QuantityStepper, Breadcrumbs, MiniCartButton; wire cart icon to header"
```

---

## Task 14: ProductCard + ProductCardSkeleton + ProductGrid

**Files:**
- Create: `apps/web/src/components/shop/product-card.tsx`
- Create: `apps/web/src/components/shop/product-card-skeleton.tsx`
- Create: `apps/web/src/components/shop/product-grid.tsx`

**Step 1: Create `product-card.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/shopify/types";
import { getDefaultVariant, isOnSale, normalizeImageUrl } from "@/lib/shopify/helpers";
import { formatDualPrice, getVentaRate } from "@/lib/shopify/currency";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export async function ProductCard({ product, priority = false }: ProductCardProps) {
  const variant = getDefaultVariant(product.variants.nodes);
  const rate = await getVentaRate();
  const { crc, usd } = formatDualPrice(variant.price, rate);
  const onSale = isOnSale(variant);

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex flex-col gap-3"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#21401d]/20">
        {product.featuredImage ? (
          <Image
            src={normalizeImageUrl(product.featuredImage.url)}
            alt={product.featuredImage.altText ?? product.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#e0ddcf]/30 text-sm">
            Sin imagen
          </div>
        )}
        {onSale && (
          <span className="absolute left-3 top-3 rounded-full bg-[#408733] px-2 py-0.5 text-xs text-white">
            Oferta
          </span>
        )}
        {!product.availableForSale && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-1">
        <p className="text-sm font-medium text-[#e0ddcf] line-clamp-2 leading-tight">
          {product.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[#e0ddcf]">{crc}</span>
          <span className="text-xs text-[#e0ddcf]/50">{usd}</span>
        </div>
      </div>
    </Link>
  );
}
```

**Step 2: Create `product-card-skeleton.tsx`**

```tsx
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square animate-pulse rounded-2xl bg-[#21401d]/40" />
      <div className="flex flex-col gap-2 px-1">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#21401d]/40" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#21401d]/40" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

**Step 3: Create `product-grid.tsx`**

```tsx
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/shopify/types";

interface ProductGridProps {
  products: Product[];
  endCursor: string | null;
  hasNextPage: boolean;
}

export function ProductGrid({ products, endCursor, hasNextPage }: ProductGridProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={i < 4}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <a
            href={`?after=${endCursor}`}
            className="rounded-full border border-[#e0ddcf]/30 px-8 py-3 text-sm text-[#e0ddcf] hover:border-[#e0ddcf]/60"
          >
            Cargar más productos
          </a>
        </div>
      )}

      {products.length === 0 && (
        <p className="text-center text-[#e0ddcf]/50">
          No se encontraron productos.
        </p>
      )}
    </div>
  );
}
```

Note: "Load More" uses a plain `<a>` link with the cursor in the URL — the `/products` page reads the `after` search param server-side and renders the next page. This is simpler and more accessible than a client-side fetch for a Server Component grid.

**Step 4: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**

```bash
git add apps/web/src/components/shop/product-card.tsx \
        apps/web/src/components/shop/product-card-skeleton.tsx \
        apps/web/src/components/shop/product-grid.tsx
git commit -m "feat: add ProductCard, ProductCardSkeleton, ProductGrid components"
```

---

## Task 15: `/products` Catalog Page

**Files:**
- Create: `apps/web/src/app/products/page.tsx`

**Step 1: Write the file**

```tsx
import { Suspense } from "react";
import { getProducts } from "@/lib/shopify/queries/product";
import { ProductGrid } from "@/components/shop/product-grid";
import { ProductGridSkeleton } from "@/components/shop/product-card-skeleton";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Header } from "@/components/home/header";

export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{ after?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { after } = await searchParams;

  const { nodes: products, pageInfo } = await getProducts({
    first: 24,
    after: after ?? null,
  });

  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[1500px] px-6 py-12 md:px-10">
        <Breadcrumbs
          crumbs={[
            { label: "Inicio", href: "/" },
            { label: "Productos" },
          ]}
        />
        <h1 className="mt-6 font-serif text-4xl text-white md:text-5xl">
          Productos
        </h1>
        <div className="mt-10">
          <Suspense fallback={<ProductGridSkeleton count={24} />}>
            <ProductGrid
              products={products}
              endCursor={pageInfo.endCursor}
              hasNextPage={pageInfo.hasNextPage}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Type-check + dev server smoke test**

```bash
cd apps/web && npx tsc --noEmit
```
Then: `npm run dev` → open `http://localhost:3000/products`

Expected: Page renders. If no Shopify products yet, shows "No se encontraron productos."

**Step 3: Commit**

```bash
git add apps/web/src/app/products/page.tsx
git commit -m "feat: add /products catalog page with ISR and cursor pagination"
```

---

## Task 16: PriceDisplay + VariantSelector + AddToCartButton + ProductImageGallery

**Files:**
- Create: `apps/web/src/components/shop/price-display.tsx`
- Create: `apps/web/src/components/shop/variant-selector.tsx`
- Create: `apps/web/src/components/shop/add-to-cart-button.tsx`
- Create: `apps/web/src/components/shop/product-image-gallery.tsx`

**Step 1: Create `price-display.tsx`**

```tsx
interface PriceDisplayProps {
  crc: string;
  usd: string;
  compareCrc?: string;
  compareUsd?: string;
}

export function PriceDisplay({ crc, usd, compareCrc, compareUsd }: PriceDisplayProps) {
  const onSale = Boolean(compareCrc);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-[#e0ddcf]">{crc}</span>
        {onSale && (
          <span className="rounded-full bg-[#408733] px-2 py-0.5 text-xs text-white">
            Oferta
          </span>
        )}
      </div>
      <span className="text-sm text-[#e0ddcf]/50">{usd}</span>
      {compareCrc && (
        <span className="text-sm text-[#e0ddcf]/40 line-through">
          {compareCrc} <span className="text-xs">({compareUsd})</span>
        </span>
      )}
    </div>
  );
}
```

**Step 2: Create `variant-selector.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ProductVariant } from "@/lib/shopify/types";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
}

export function VariantSelector({ variants, selectedVariantId }: VariantSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (variants.length <= 1 && variants[0]?.title === "Default Title") {
    return null;
  }

  function selectVariant(variant: ProductVariant) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", variant.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const isSelected = variant.id === selectedVariantId;
        const unavailable = !variant.availableForSale;

        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => selectVariant(variant)}
            disabled={unavailable}
            title={unavailable ? "Sin stock" : variant.title}
            className={[
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              isSelected
                ? "border-[#408733] bg-[#408733] text-white"
                : "border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60",
              unavailable && "cursor-not-allowed opacity-40",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {variant.title}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 3: Create `add-to-cart-button.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useCart } from "./cart-context";

interface AddToCartButtonProps {
  variantId: string;
  quantity: number;
  available: boolean;
}

type ButtonState = "idle" | "loading" | "added";

export function AddToCartButton({ variantId, quantity, available }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [state, setState] = useState<ButtonState>("idle");
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== "added") return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        btnRef.current,
        { scale: 1 },
        { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.inOut" }
      );
    });
    const timer = setTimeout(() => setState("idle"), 1500);
    return () => {
      ctx.revert();
      clearTimeout(timer);
    };
  }, [state]);

  async function handleClick() {
    if (state !== "idle" || !available) return;
    setState("loading");
    try {
      await addToCart(variantId, quantity);
      setState("added");
    } catch {
      setState("idle");
    }
  }

  const labels: Record<ButtonState, string> = {
    idle: "Agregar al carrito",
    loading: "Agregando...",
    added: "¡Agregado!",
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      disabled={!available || state === "loading"}
      className={[
        "flex h-14 w-full items-center justify-center rounded-full text-sm font-medium transition-colors",
        available
          ? state === "added"
            ? "bg-[#21401d] text-[#e0ddcf]"
            : "bg-[#408733] text-white hover:bg-[#336629]"
          : "cursor-not-allowed bg-[#e0ddcf]/10 text-[#e0ddcf]/40",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {available ? labels[state] : "Agotado"}
    </button>
  );
}
```

**Step 4: Create `product-image-gallery.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import type { ShopifyImage } from "@/lib/shopify/types";
import { normalizeImageUrl } from "@/lib/shopify/helpers";

interface ProductImageGalleryProps {
  images: ShopifyImage[];
  title: string;
}

export function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    if (selectedIndex === prevIndexRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainImageRef.current,
        { opacity: 0, scale: 1.03 },
        { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }
      );
    });
    prevIndexRef.current = selectedIndex;
    return () => ctx.revert();
  }, [selectedIndex]);

  const currentImage = images[selectedIndex];

  if (!currentImage) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div
        ref={mainImageRef}
        className="relative aspect-square overflow-hidden rounded-3xl bg-[#21401d]/20"
      >
        <Image
          src={normalizeImageUrl(currentImage.url)}
          alt={currentImage.altText ?? title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={[
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                i === selectedIndex
                  ? "border-[#408733]"
                  : "border-transparent hover:border-[#e0ddcf]/30",
              ].join(" ")}
            >
              <Image
                src={normalizeImageUrl(img.url)}
                alt={img.altText ?? `${title} ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add apps/web/src/components/shop/price-display.tsx \
        apps/web/src/components/shop/variant-selector.tsx \
        apps/web/src/components/shop/add-to-cart-button.tsx \
        apps/web/src/components/shop/product-image-gallery.tsx
git commit -m "feat: add PriceDisplay, VariantSelector, AddToCartButton, ProductImageGallery"
```

---

## Task 17: `/products/[handle]` Product Detail Page

**Files:**
- Create: `apps/web/src/app/products/[handle]/page.tsx`

**Step 1: Write the file**

```tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProduct } from "@/lib/shopify/queries/product";
import { getVentaRate, formatDualPrice } from "@/lib/shopify/currency";
import { getDefaultVariant, isOnSale } from "@/lib/shopify/helpers";
import { ProductImageGallery } from "@/components/shop/product-image-gallery";
import { VariantSelector } from "@/components/shop/variant-selector";
import { PriceDisplay } from "@/components/shop/price-display";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Header } from "@/components/home/header";
import { QuantityAndCart } from "@/components/shop/quantity-and-cart";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ variant?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return {};
  return {
    title: `${product.title} — FarmaPlus`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const { variant: variantId } = await searchParams;

  const product = await getProduct(handle);
  if (!product) notFound();

  const selectedVariant =
    product.variants.nodes.find((v) => v.id === variantId) ??
    getDefaultVariant(product.variants.nodes);

  const rate = await getVentaRate();
  const { crc, usd } = formatDualPrice(selectedVariant.price, rate);

  const comparePrices = isOnSale(selectedVariant) && selectedVariant.compareAtPrice
    ? formatDualPrice(selectedVariant.compareAtPrice, rate)
    : null;

  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-10">
        <Breadcrumbs
          crumbs={[
            { label: "Inicio", href: "/" },
            { label: "Productos", href: "/products" },
            { label: product.title },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          {/* Left: image gallery */}
          <ProductImageGallery
            images={product.images.nodes}
            title={product.title}
          />

          {/* Right: product info */}
          <div className="flex flex-col gap-6">
            {product.productType && (
              <p className="text-sm uppercase tracking-widest text-[#408733]">
                {product.productType}
              </p>
            )}

            <h1 className="font-serif text-3xl leading-tight text-white md:text-4xl">
              {product.title}
            </h1>

            <PriceDisplay
              crc={crc}
              usd={usd}
              compareCrc={comparePrices?.crc}
              compareUsd={comparePrices?.usd}
            />

            <VariantSelector
              variants={product.variants.nodes}
              selectedVariantId={selectedVariant.id}
            />

            <QuantityAndCart
              variant={selectedVariant}
            />

            {product.description && (
              <div className="border-t border-[#e0ddcf]/10 pt-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#e0ddcf]/60">
                  Descripción
                </h2>
                <p className="text-sm leading-relaxed text-[#e0ddcf]/80">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Create `quantity-and-cart.tsx`** (client component for quantity + ATC)

The PDP needs quantity state before adding to cart. Extract to a small client component:

Create `apps/web/src/components/shop/quantity-and-cart.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ProductVariant } from "@/lib/shopify/types";
import { QuantityStepper } from "./quantity-stepper";
import { AddToCartButton } from "./add-to-cart-button";

export function QuantityAndCart({ variant }: { variant: ProductVariant }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <QuantityStepper
        value={quantity}
        min={1}
        max={variant.quantityAvailable}
        onChange={setQuantity}
      />
      <AddToCartButton
        variantId={variant.id}
        quantity={quantity}
        available={variant.availableForSale}
      />
    </div>
  );
}
```

**Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Smoke test**

```bash
npm run dev
```
Navigate to `http://localhost:3000/products/[any-handle]`. Page renders with product data.

**Step 5: Commit**

```bash
git add apps/web/src/app/products/\[handle\]/page.tsx \
        apps/web/src/components/shop/quantity-and-cart.tsx
git commit -m "feat: add /products/[handle] PDP with variant selection and ATC"
```

---

## Task 18: CartDrawer + CartItem + CartLineList + CartSummary

**Files:**
- Create: `apps/web/src/components/shop/cart-item.tsx`
- Create: `apps/web/src/components/shop/cart-summary.tsx`
- Create: `apps/web/src/components/shop/cart-drawer.tsx`

**Step 1: Create `cart-item.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useCart } from "./cart-context";
import { QuantityStepper } from "./quantity-stepper";
import { normalizeImageUrl } from "@/lib/shopify/helpers";
import type { CartLine } from "@/lib/shopify/types";

export function CartItem({ line }: { line: CartLine }) {
  const { updateCartLine, removeCartLine } = useCart();
  const { merchandise, quantity } = line;

  return (
    <div className="flex gap-4 py-4">
      {merchandise.product.featuredImage && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#21401d]/20">
          <Image
            src={normalizeImageUrl(merchandise.product.featuredImage.url)}
            alt={merchandise.product.featuredImage.altText ?? merchandise.product.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#e0ddcf]">
              {merchandise.product.title}
            </p>
            {merchandise.title !== "Default Title" && (
              <p className="text-xs text-[#e0ddcf]/50">{merchandise.title}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeCartLine(line.id)}
            aria-label="Eliminar producto"
            className="text-[#e0ddcf]/40 hover:text-[#e0ddcf]/80"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between">
          <QuantityStepper
            value={quantity}
            min={1}
            max={99}
            onChange={(val) => updateCartLine(line.id, val)}
          />
          <span className="text-sm text-[#e0ddcf]">
            ₡{(Math.round(parseFloat(merchandise.price.amount)) * quantity).toLocaleString("de-DE")}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create `cart-summary.tsx`**

```tsx
"use client";

import { useCart } from "./cart-context";

export function CartSummary() {
  const { cart } = useCart();
  if (!cart) return null;

  const subtotalCRC = Math.round(parseFloat(cart.cost.subtotalAmount.amount));

  return (
    <div className="border-t border-[#e0ddcf]/10 pt-4">
      <div className="flex justify-between text-sm text-[#e0ddcf]">
        <span>Subtotal</span>
        <span className="font-semibold">
          ₡{subtotalCRC.toLocaleString("de-DE")}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#e0ddcf]/40">
        Envío e impuestos calculados al pagar.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.href = cart.checkoutUrl;
        }}
        className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-[#408733] text-sm font-medium text-white hover:bg-[#336629]"
      >
        Ir al pago
      </button>
    </div>
  );
}
```

**Step 3: Create `cart-drawer.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useCart } from "./cart-context";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

export function CartDrawer() {
  const { cart, isOpen, closeCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Set initial hidden state on mount
  useEffect(() => {
    gsap.set(drawerRef.current, { x: "100%" });
    gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
  }, []);

  // Animate on isOpen change
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (isOpen) {
        gsap.to(drawerRef.current, { x: 0, duration: 0.4, ease: "power3.out" });
        gsap.to(overlayRef.current, {
          opacity: 1,
          pointerEvents: "auto",
          duration: 0.3,
        });
      } else {
        gsap.to(drawerRef.current, {
          x: "100%",
          duration: 0.35,
          ease: "power3.in",
        });
        gsap.to(overlayRef.current, {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.3,
        });
      }
    });
    return () => ctx.revert();
  }, [isOpen]);

  const lines = cart?.lines.nodes ?? [];

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={closeCart}
        className="fixed inset-0 z-30 bg-black/50"
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Carrito de compras"
        aria-modal="true"
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col bg-[#222721] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e0ddcf]/10 px-6 py-4">
          <h2 className="font-serif text-xl text-white">
            Carrito
            {cart && cart.totalQuantity > 0 && (
              <span className="ml-2 text-sm text-[#e0ddcf]/50">
                ({cart.totalQuantity})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="text-[#e0ddcf]/60 hover:text-[#e0ddcf]"
          >
            ✕
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-6">
          {lines.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#e0ddcf]/40">
              Tu carrito está vacío.
            </p>
          ) : (
            <div className="divide-y divide-[#e0ddcf]/10">
              {lines.map((line) => (
                <CartItem key={line.id} line={line} />
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {lines.length > 0 && (
          <div className="px-6 pb-8">
            <CartSummary />
          </div>
        )}
      </div>
    </>
  );
}
```

**Step 4: Add `CartDrawer` to `providers.tsx`**

```tsx
"use client";

import { CartProvider } from "./cart-context";
import { CartDrawer } from "./cart-drawer";
import { ErrorToast } from "./error-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
      <ErrorToast />
    </CartProvider>
  );
}
```

**Step 5: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 6: Smoke test**

```bash
npm run dev
```
Open any PDP → click "Agregar al carrito" → drawer slides in from right.

**Step 7: Commit**

```bash
git add apps/web/src/components/shop/cart-item.tsx \
        apps/web/src/components/shop/cart-summary.tsx \
        apps/web/src/components/shop/cart-drawer.tsx \
        apps/web/src/components/shop/providers.tsx
git commit -m "feat: add CartDrawer with GSAP slide-in, CartItem, CartSummary"
```

---

## Task 19: `/cart` Page

**Files:**
- Create: `apps/web/src/app/cart/page.tsx`

**Step 1: Write the file**

```tsx
import { Header } from "@/components/home/header";
import { CartPageClient } from "@/components/shop/cart-page-client";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[800px] px-6 py-12 md:px-10">
        <h1 className="font-serif text-4xl text-white md:text-5xl">Carrito</h1>
        <div className="mt-10">
          <CartPageClient />
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Create `cart-page-client.tsx`**

```tsx
"use client";

import { useCart } from "./cart-context";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";
import Link from "next/link";

export function CartPageClient() {
  const { cart, cartStatus } = useCart();

  if (cartStatus === "loading") {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#21401d]/40" />
        ))}
      </div>
    );
  }

  const lines = cart?.lines.nodes ?? [];

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-[#e0ddcf]/60">Tu carrito está vacío.</p>
        <Link
          href="/products"
          className="rounded-full bg-[#408733] px-8 py-3 text-sm text-white hover:bg-[#336629]"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="divide-y divide-[#e0ddcf]/10">
        {lines.map((line) => (
          <CartItem key={line.id} line={line} />
        ))}
      </div>
      <div>
        <CartSummary />
      </div>
    </div>
  );
}
```

**Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add apps/web/src/app/cart/page.tsx \
        apps/web/src/components/shop/cart-page-client.tsx
git commit -m "feat: add /cart page as Server Component shell with client cart state"
```

---

## Task 20: CollectionNav + `/collections/[handle]` Page

**Files:**
- Create: `apps/web/src/components/shop/collection-nav.tsx`
- Create: `apps/web/src/components/shop/collection-nav-skeleton.tsx`
- Create: `apps/web/src/app/collections/[handle]/page.tsx`

**Step 1: Create `collection-nav-skeleton.tsx`**

```tsx
export function CollectionNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-[#21401d]/40"
        />
      ))}
    </div>
  );
}
```

**Step 2: Create `collection-nav.tsx`**

```tsx
import Link from "next/link";
import type { ShopifyCollection } from "@/lib/shopify/types";

interface CollectionNavProps {
  collections: ShopifyCollection[];
  activeHandle?: string;
}

export function CollectionNav({ collections, activeHandle }: CollectionNavProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto scrollbar-hide">
      <Link
        href="/products"
        className={[
          "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
          !activeHandle
            ? "border-[#408733] bg-[#408733] text-white"
            : "border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60",
        ].join(" ")}
      >
        Todos
      </Link>
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/collections/${col.handle}`}
          className={[
            "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
            col.handle === activeHandle
              ? "border-[#408733] bg-[#408733] text-white"
              : "border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60",
          ].join(" ")}
        >
          {col.title}
        </Link>
      ))}
    </nav>
  );
}
```

**Step 3: Create `/collections/[handle]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCollection, getCollections } from "@/lib/shopify/queries/collection";
import { ProductGrid } from "@/components/shop/product-grid";
import { ProductGridSkeleton } from "@/components/shop/product-card-skeleton";
import { CollectionNav } from "@/components/shop/collection-nav";
import { CollectionNavSkeleton } from "@/components/shop/collection-nav-skeleton";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Header } from "@/components/home/header";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ after?: string }>;
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const { after } = await searchParams;

  const [result, collections] = await Promise.all([
    getCollection(handle, { first: 24, after: after ?? null }),
    getCollections(),
  ]);

  if (!result) notFound();

  const { collection, products } = result;

  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[1500px] px-6 py-12 md:px-10">
        <Breadcrumbs
          crumbs={[
            { label: "Inicio", href: "/" },
            { label: "Productos", href: "/products" },
            { label: collection.title },
          ]}
        />

        <div className="mt-6">
          <Suspense fallback={<CollectionNavSkeleton />}>
            <CollectionNav collections={collections} activeHandle={handle} />
          </Suspense>
        </div>

        <h1 className="mt-8 font-serif text-4xl text-white md:text-5xl">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-3 max-w-xl text-[#e0ddcf]/60">{collection.description}</p>
        )}

        <div className="mt-10">
          <Suspense fallback={<ProductGridSkeleton count={24} />}>
            <ProductGrid
              products={products.nodes}
              endCursor={products.pageInfo.endCursor}
              hasNextPage={products.pageInfo.hasNextPage}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**

```bash
git add apps/web/src/components/shop/collection-nav.tsx \
        apps/web/src/components/shop/collection-nav-skeleton.tsx \
        apps/web/src/app/collections/\[handle\]/page.tsx
git commit -m "feat: add CollectionNav and /collections/[handle] page"
```

---

## Task 21: SearchBar + `/search` Page

**Files:**
- Create: `apps/web/src/components/shop/search-bar.tsx`
- Create: `apps/web/src/app/search/page.tsx`

**Step 1: Create `search-bar.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { normalizeSearchQuery } from "@/lib/shopify/helpers";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const q = normalizeSearchQuery(value);
        if (q.length < 2) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("q", q);
        router.push(`/search?${params.toString()}`);
      }, 300);
    },
    [router, searchParams]
  );

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Buscar productos..."
      className="w-full rounded-full border border-[#e0ddcf]/30 bg-transparent px-5 py-3 text-sm text-[#e0ddcf] placeholder:text-[#e0ddcf]/40 focus:border-[#408733] focus:outline-none"
    />
  );
}
```

**Step 2: Create `/search/page.tsx`**

```tsx
import { Suspense } from "react";
import { searchProducts } from "@/lib/shopify/queries/search";
import { ProductGrid } from "@/components/shop/product-grid";
import { ProductGridSkeleton } from "@/components/shop/product-card-skeleton";
import { SearchBar } from "@/components/shop/search-bar";
import { Header } from "@/components/home/header";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; after?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, after } = await searchParams;

  const { nodes: products, pageInfo } = q
    ? await searchProducts(q, { after: after ?? null })
    : { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };

  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[1500px] px-6 py-12 md:px-10">
        <h1 className="font-serif text-4xl text-white md:text-5xl">Buscar</h1>

        <div className="mt-6 max-w-xl">
          <Suspense>
            <SearchBar defaultValue={q ?? ""} />
          </Suspense>
        </div>

        {q && (
          <p className="mt-4 text-sm text-[#e0ddcf]/50">
            {products.length > 0
              ? `Resultados para "${q}"`
              : `Sin resultados para "${q}"`}
          </p>
        )}

        <div className="mt-10">
          <Suspense fallback={<ProductGridSkeleton count={24} />}>
            <ProductGrid
              products={products}
              endCursor={pageInfo.endCursor}
              hasNextPage={pageInfo.hasNextPage}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add apps/web/src/components/shop/search-bar.tsx \
        apps/web/src/app/search/page.tsx
git commit -m "feat: add SearchBar with debounce and /search page"
```

---

## Task 22: `/api/revalidate` Webhook Route

**Files:**
- Create: `apps/web/src/app/api/revalidate/route.ts`

**Step 1: Write the file**

```ts
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

function verifyHmac(body: string, signature: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;

  const digest = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(digest, "base64"),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = request.headers.get("X-Shopify-Topic") ?? "";
  const body = await request.text();

  if (!verifyHmac(body, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const handle = (payload.handle as string | undefined) ?? "";

  switch (topic) {
    case "inventory_levels/update":
    case "products/update":
      if (handle) revalidateTag(`shopify-product-${handle}`);
      break;

    case "products/delete":
      if (handle) revalidateTag(`shopify-product-${handle}`);
      revalidateTag("shopify-products");
      break;

    case "collections/update":
    case "collections/delete":
      revalidateTag("shopify-products");
      break;

    default:
      // Unknown topic — no-op
      break;
  }

  return NextResponse.json({ revalidated: true });
}
```

**Step 2: Type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Register the webhook in Shopify Admin**

After deploying to Vercel:

Shopify Admin → Settings → Notifications → Webhooks → Create webhook:

| Event | URL |
|---|---|
| Product creation | `https://your-domain.com/api/revalidate` |
| Product update | `https://your-domain.com/api/revalidate` |
| Product deletion | `https://your-domain.com/api/revalidate` |
| Collection update | `https://your-domain.com/api/revalidate` |
| Inventory level update | `https://your-domain.com/api/revalidate` |

Copy the webhook signing secret → add to `.env.local` as `SHOPIFY_WEBHOOK_SECRET` and to Vercel env vars.

**Step 4: Commit**

```bash
git add apps/web/src/app/api/revalidate/route.ts
git commit -m "feat: add Shopify webhook revalidation route with HMAC verification"
```

---

## Task 23: Final Verification + Build

**Step 1: Full type-check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 errors.

**Step 2: Production build**

```bash
cd apps/web && npm run build
```
Expected: Build succeeds. Check for:
- No `Dynamic server usage` errors on ISR routes
- `/products`, `/products/[handle]`, `/collections/[handle]` listed as ISR pages
- `/cart`, `/search` listed as dynamic pages

**Step 3: Lint**

```bash
cd apps/web && npm run lint
```
Fix any errors before merging.

**Step 4: Smoke test golden path in browser**

```
1. / (landing page) — existing animations still work, no regressions
2. /products — catalog renders, "Cargar más" works
3. /products/[handle] — PDP renders, variant selector works
4. Click "Agregar al carrito" — drawer slides in from right
5. Change quantity in drawer — stepper updates line
6. Remove item — line disappears
7. Click "Ir al pago" — redirects to Shopify checkout URL
8. /cart — shows same cart state
9. /search?q=paracetamol — returns results
10. /collections/[handle] — collection page renders with nav
11. Header cart icon — shows correct count badge
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete headless Shopify integration — catalog, PDP, cart, search"
```

---

## Environment Variables Reference

```bash
# apps/web/.env.local
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=            # set after Task 22
BCCR_EMAIL=                        # optional, BCCR fallback only
BCCR_TOKEN=                        # optional, BCCR fallback only

# Existing (unchanged)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Vercel env vars to add:** Same as above — add all `SHOPIFY_*` vars in Vercel dashboard under the production environment.

---

## Known Limitations / Future Work

- **`inventory_levels/update` webhook payload** — Shopify sends `inventory_item_id` and `location_id`, not `handle`. The `/api/revalidate` handler above does a no-op for inventory updates without a handle. To bust the right PDP cache, you'd need an additional Shopify Admin API call to resolve `inventory_item_id → product handle`. Add this in a follow-up task.
- **Cart page SSR hydration** — `/cart` is `force-dynamic` but CartContext hydrates on the client via `useEffect`. There will be a brief flash of empty state. Can be improved by server-reading the cartId cookie and passing initial cart data as a prop.
- **Bulk price changes** — To bust all ISR pages at once (e.g. store-wide sale), call `revalidateTag('shopify')` manually via a protected admin endpoint. Not yet implemented.
- **`/products` + `CollectionNav`** — The catalog page currently doesn't show the CollectionNav. Add `getCollections()` to the products page and render `CollectionNav` there for full consistency.
