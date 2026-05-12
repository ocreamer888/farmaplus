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
