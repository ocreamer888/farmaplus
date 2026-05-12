import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/shopify/types";
import { getDefaultVariant, isOnSale, normalizeImageUrl } from "@/lib/shopify/helpers";
import { formatDualPrice, getVentaRate } from "@/lib/shopify/currency";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export async function ProductCard({ product, priority = false }: ProductCardProps) {
  const variant = getDefaultVariant(product.variants.nodes);
  const rate = await getVentaRate();
  const { crc, usd } = formatDualPrice(variant.price, rate);
  const onSale = isOnSale(variant);

  return (
    <Link href={`/products/${product.handle}`} className="group flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#21401d]/20">
        {product.featuredImage ? (
          <Image
            src={normalizeImageUrl(product.featuredImage.url)}
            alt={product.featuredImage.altText ?? product.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#e0ddcf]/30 text-sm">
            Sin imagen
          </div>
        )}
        {onSale && (
          <span className="absolute left-3 top-3 rounded-full bg-[#408733] px-2 py-0.5 text-xs text-white">
            Oferta
          </span>
        )}
        {!product.availableForSale && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-1">
        <p className="text-sm font-medium text-[#e0ddcf] line-clamp-2 leading-tight">
          {product.title}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[#e0ddcf]">{crc}</span>
          <span className="text-xs text-[#e0ddcf]/50">{usd}</span>
        </div>
      </div>
    </Link>
  );
}
