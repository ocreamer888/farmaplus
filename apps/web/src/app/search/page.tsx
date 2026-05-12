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
