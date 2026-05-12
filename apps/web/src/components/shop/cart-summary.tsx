"use client";

import { useCart } from "./cart-context";

export function CartSummary() {
  const { cart } = useCart();
  if (!cart) return null;

  const subtotalCRC = Math.round(parseFloat(cart.cost.subtotalAmount.amount));

  return (
    <div className="border-t border-[#e0ddcf]/10 pt-4">
      <div className="flex justify-between text-sm text-[#e0ddcf]">
        <span>Subtotal</span>
        <span className="font-semibold">₡{subtotalCRC.toLocaleString("de-DE")}</span>
      </div>
      <p className="mt-1 text-xs text-[#e0ddcf]/40">
        Envío e impuestos calculados al pagar.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.href = cart.checkoutUrl;
        }}
        className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-[#408733] text-sm font-medium text-white hover:bg-[#336629]"
      >
        Ir al pago
      </button>
    </div>
  );
}
