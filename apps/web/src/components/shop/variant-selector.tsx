"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ProductVariant } from "@/lib/shopify/types";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId: string;
}

export function VariantSelector({ variants, selectedVariantId }: VariantSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (variants.length <= 1 && variants[0]?.title === "Default Title") {
    return null;
  }

  function selectVariant(variant: ProductVariant) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", variant.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const isSelected = variant.id === selectedVariantId;
        const unavailable = !variant.availableForSale;

        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => selectVariant(variant)}
            disabled={unavailable}
            title={unavailable ? "Sin stock" : variant.title}
            className={[
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              isSelected
                ? "border-[#408733] bg-[#408733] text-white"
                : "border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60",
              unavailable && "cursor-not-allowed opacity-40",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {variant.title}
          </button>
        );
      })}
    </div>
  );
}
