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
