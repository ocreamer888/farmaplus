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
