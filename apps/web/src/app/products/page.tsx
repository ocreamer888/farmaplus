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
        <h1 className="mt-6 font-serif text-4xl text-white md:text-5xl">Productos</h1>
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
