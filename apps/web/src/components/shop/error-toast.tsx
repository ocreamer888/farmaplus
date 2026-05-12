"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";

export function ErrorToast() {
  const { error, setError } = useCart();

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error, setError]);

  if (!error) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-5 py-3 text-sm text-white shadow-lg"
    >
      {error}
    </div>
  );
}
