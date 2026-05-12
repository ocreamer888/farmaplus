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
