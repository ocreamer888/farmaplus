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
