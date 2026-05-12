"use client";

import { CartProvider } from "./cart-context";
import { CartDrawer } from "./cart-drawer";
import { ErrorToast } from "./error-toast";

export function Providers({
  children,
  cartId,
}: {
  children: React.ReactNode;
  cartId: string | undefined;
}) {
  return (
    <CartProvider cartId={cartId}>
      {children}
      <CartDrawer />
      <ErrorToast />
    </CartProvider>
  );
}
