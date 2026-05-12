"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

export function CartPageClient() {
  const { cart, cartStatus } = useCart();

  if (cartStatus === "loading") {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#21401d]/40" />
        ))}
      </div>
    );
  }

  const lines = cart?.lines.nodes ?? [];

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-[#e0ddcf]/60">Tu carrito está vacío.</p>
        <Link
          href="/products"
          className="rounded-full bg-[#408733] px-8 py-3 text-sm text-white hover:bg-[#336629]"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="divide-y divide-[#e0ddcf]/10">
        {lines.map((line) => (
          <CartItem key={line.id} line={line} />
        ))}
      </div>
      <div>
        <CartSummary />
      </div>
    </div>
  );
}
