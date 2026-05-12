"use client";

import { useState } from "react";
import type { ProductVariant } from "@/lib/shopify/types";
import { QuantityStepper } from "./quantity-stepper";
import { AddToCartButton } from "./add-to-cart-button";

export function QuantityAndCart({ variant }: { variant: ProductVariant }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <QuantityStepper
        value={quantity}
        min={1}
        max={variant.quantityAvailable}
        onChange={setQuantity}
      />
      <AddToCartButton
        variantId={variant.id}
        quantity={quantity}
        available={variant.availableForSale}
      />
    </div>
  );
}
