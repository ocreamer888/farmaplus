"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useCart } from "./cart-context";

interface AddToCartButtonProps {
  variantId: string;
  quantity: number;
  available: boolean;
}

type ButtonState = "idle" | "loading" | "added";

export function AddToCartButton({ variantId, quantity, available }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [state, setState] = useState<ButtonState>("idle");
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== "added") return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        btnRef.current,
        { scale: 1 },
        { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.inOut" }
      );
    });
    const timer = setTimeout(() => setState("idle"), 1500);
    return () => {
      ctx.revert();
      clearTimeout(timer);
    };
  }, [state]);

  async function handleClick() {
    if (state !== "idle" || !available) return;
    setState("loading");
    try {
      await addToCart(variantId, quantity);
      setState("added");
    } catch {
      setState("idle");
    }
  }

  const labels: Record<ButtonState, string> = {
    idle: "Agregar al carrito",
    loading: "Agregando...",
    added: "¡Agregado!",
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      disabled={!available || state === "loading"}
      className={[
        "flex h-14 w-full items-center justify-center rounded-full text-sm font-medium transition-colors",
        available
          ? state === "added"
            ? "bg-[#21401d] text-[#e0ddcf]"
            : "bg-[#408733] text-white hover:bg-[#336629]"
          : "cursor-not-allowed bg-[#e0ddcf]/10 text-[#e0ddcf]/40",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {available ? labels[state] : "Agotado"}
    </button>
  );
}
