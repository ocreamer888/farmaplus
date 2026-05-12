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
          <ProductCard key={product.id} product={product} priority={i < 4} />
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
        <p className="text-center text-[#e0ddcf]/50">No se encontraron productos.</p>
      )}
    </div>
  );
}
