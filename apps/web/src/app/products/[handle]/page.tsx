import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shopify/queries/product";
import { getVentaRate, formatDualPrice } from "@/lib/shopify/currency";
import { getDefaultVariant, isOnSale } from "@/lib/shopify/helpers";
import { ProductImageGallery } from "@/components/shop/product-image-gallery";
import { VariantSelector } from "@/components/shop/variant-selector";
import { PriceDisplay } from "@/components/shop/price-display";
import { QuantityAndCart } from "@/components/shop/quantity-and-cart";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Header } from "@/components/home/header";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ variant?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return {};
  return {
    title: `${product.title} — FarmaPlus`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const { variant: variantId } = await searchParams;

  const product = await getProduct(handle);
  if (!product) notFound();

  const selectedVariant =
    product.variants.nodes.find((v) => v.id === variantId) ??
    getDefaultVariant(product.variants.nodes);

  const rate = await getVentaRate();
  const { crc, usd } = formatDualPrice(selectedVariant.price, rate);

  const comparePrices =
    isOnSale(selectedVariant) && selectedVariant.compareAtPrice
      ? formatDualPrice(selectedVariant.compareAtPrice, rate)
      : null;

  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-10">
        <Breadcrumbs
          crumbs={[
            { label: "Inicio", href: "/" },
            { label: "Productos", href: "/products" },
            { label: product.title },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <ProductImageGallery images={product.images.nodes} title={product.title} />

          <div className="flex flex-col gap-6">
            {product.productType && (
              <p className="text-sm uppercase tracking-widest text-[#408733]">
                {product.productType}
              </p>
            )}

            <h1 className="font-serif text-3xl leading-tight text-white md:text-4xl">
              {product.title}
            </h1>

            <PriceDisplay
              crc={crc}
              usd={usd}
              compareCrc={comparePrices?.crc}
              compareUsd={comparePrices?.usd}
            />

            <VariantSelector
              variants={product.variants.nodes}
              selectedVariantId={selectedVariant.id}
            />

            <QuantityAndCart variant={selectedVariant} />

            {product.description && (
              <div className="border-t border-[#e0ddcf]/10 pt-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#e0ddcf]/60">
                  Descripción
                </h2>
                <p className="text-sm leading-relaxed text-[#e0ddcf]/80">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
