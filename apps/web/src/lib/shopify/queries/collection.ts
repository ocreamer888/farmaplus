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
