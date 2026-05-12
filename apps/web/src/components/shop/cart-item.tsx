"use client";

import Image from "next/image";
import { useCart } from "./cart-context";
import { QuantityStepper } from "./quantity-stepper";
import { normalizeImageUrl } from "@/lib/shopify/helpers";
import type { CartLine } from "@/lib/shopify/types";

export function CartItem({ line }: { line: CartLine }) {
  const { updateCartLine, removeCartLine } = useCart();
  const { merchandise, quantity } = line;

  return (
    <div className="flex gap-4 py-4">
      {merchandise.product.featuredImage && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#21401d]/20">
          <Image
            src={normalizeImageUrl(merchandise.product.featuredImage.url)}
            alt={merchandise.product.featuredImage.altText ?? merchandise.product.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#e0ddcf]">
              {merchandise.product.title}
            </p>
            {merchandise.title !== "Default Title" && (
              <p className="text-xs text-[#e0ddcf]/50">{merchandise.title}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeCartLine(line.id)}
            aria-label="Eliminar producto"
            className="text-[#e0ddcf]/40 hover:text-[#e0ddcf]/80"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between">
          <QuantityStepper
            value={quantity}
            min={1}
            max={99}
            onChange={(val) => updateCartLine(line.id, val)}
          />
          <span className="text-sm text-[#e0ddcf]">
            ₡{(Math.round(parseFloat(merchandise.price.amount)) * quantity).toLocaleString("de-DE")}
          </span>
        </div>
      </div>
    </div>
  );
}
