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
