"use client";

import { useCart } from "./cart-context";

export function MiniCartButton() {
  const { cart, cartStatus, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="Abrir carrito"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60"
    >
      {/* Bag icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>

      {/* Loading skeleton */}
      {cartStatus === "loading" && (
        <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-[#e0ddcf]/30" />
      )}

      {/* Count badge */}
      {cartStatus === "idle" && cart && cart.totalQuantity > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#408733] text-[10px] font-medium text-white">
          {cart.totalQuantity > 99 ? "99+" : cart.totalQuantity}
        </span>
      )}
    </button>
  );
}
