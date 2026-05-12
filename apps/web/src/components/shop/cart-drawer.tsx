"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useCart } from "./cart-context";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

export function CartDrawer() {
  const { cart, isOpen, closeCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const ctx = gsap.context(() => {
      if (isOpen) {
        gsap.to(drawerRef.current, { x: 0, duration: 0.4, ease: "power3.out" });
        gsap.to(overlayRef.current, { opacity: 1, pointerEvents: "auto", duration: 0.3 });
      } else {
        gsap.to(drawerRef.current, { x: "100%", duration: 0.35, ease: "power3.in" });
        gsap.to(overlayRef.current, { opacity: 0, pointerEvents: "none", duration: 0.3 });
      }
    });
    return () => ctx.revert();
  }, [isOpen]);

  const lines = cart?.lines.nodes ?? [];

  return (
    <>
      <div
        ref={overlayRef}
        onClick={closeCart}
        className="fixed inset-0 z-30 bg-black/50"
        style={{ opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Carrito de compras"
        aria-modal="true"
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col bg-[#222721] shadow-2xl"
        style={{ transform: "translateX(100%)" }}
      >
        <div className="flex items-center justify-between border-b border-[#e0ddcf]/10 px-6 py-4">
          <h2 className="font-serif text-xl text-white">
            Carrito
            {cart && cart.totalQuantity > 0 && (
              <span className="ml-2 text-sm text-[#e0ddcf]/50">({cart.totalQuantity})</span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="text-[#e0ddcf]/60 hover:text-[#e0ddcf]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {lines.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#e0ddcf]/40">
              Tu carrito está vacío.
            </p>
          ) : (
            <div className="divide-y divide-[#e0ddcf]/10">
              {lines.map((line) => (
                <CartItem key={line.id} line={line} />
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="px-6 pb-8">
            <CartSummary />
          </div>
        )}
      </div>
    </>
  );
}
