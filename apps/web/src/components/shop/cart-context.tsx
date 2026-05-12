"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import type { Cart } from "@/lib/shopify/types";
import { getCart } from "@/lib/shopify/mutations/cart";
import {
  addToCart,
  removeCartLine,
  updateCartLine,
} from "@/lib/shopify/mutations/cart-actions";

interface CartState {
  cart: Cart | null;
  cartStatus: "idle" | "loading" | "error";
  error: string | null;
  isOpen: boolean;
}

type CartAction =
  | { type: "SET_LOADING" }
  | { type: "SET_CART"; cart: Cart }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, cartStatus: "loading" };
    case "SET_CART":
      return { ...state, cart: action.cart, cartStatus: "idle", error: null };
    case "SET_ERROR":
      return { ...state, error: action.error, cartStatus: "idle" };
    case "OPEN_CART":
      return { ...state, isOpen: true };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

interface CartContextValue {
  cart: Cart | null;
  cartStatus: "idle" | "loading" | "error";
  error: string | null;
  setError: (msg: string | null) => void;
  addToCart: (variantId: string, quantity: number) => Promise<void>;
  updateCartLine: (lineId: string, quantity: number) => Promise<void>;
  removeCartLine: (lineId: string) => Promise<void>;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  cartId,
}: {
  children: React.ReactNode;
  cartId: string | undefined;
}) {
  const [state, dispatch] = useReducer(cartReducer, {
    cart: null,
    cartStatus: cartId ? "loading" : "idle",
    error: null,
    isOpen: false,
  });

  // Hydrate cart on mount using the server-provided cartId
  useEffect(() => {
    if (!cartId) return;

    getCart(cartId)
      .then((cart) => {
        if (cart) {
          dispatch({ type: "SET_CART", cart });
        } else {
          // Stale cookie — cart expired on Shopify's end (~30 days inactivity).
          // Clear it so the next addToCart creates a fresh cart instead of
          // silently attempting to mutate a non-existent cart ID.
          document.cookie = "cartId=; Max-Age=0; path=/";
          dispatch({ type: "SET_ERROR", error: null });
        }
      })
      .catch(() => dispatch({ type: "SET_ERROR", error: null }));
  }, [cartId]);

  const snapshotRef = useRef<Cart | null>(null);

  const handleAddToCart = useCallback(
    async (variantId: string, quantity: number) => {
      snapshotRef.current = state.cart;
      try {
        const updatedCart = await addToCart(variantId, quantity);
        dispatch({ type: "SET_CART", cart: updatedCart });
        dispatch({ type: "OPEN_CART" });
      } catch {
        dispatch({ type: "SET_CART", cart: snapshotRef.current! });
        dispatch({
          type: "SET_ERROR",
          error: "No se pudo agregar al carrito. Intenta de nuevo.",
        });
      }
    },
    [state.cart]
  );

  const handleUpdateCartLine = useCallback(
    async (lineId: string, quantity: number) => {
      snapshotRef.current = state.cart;
      try {
        const updatedCart = await updateCartLine(lineId, quantity);
        dispatch({ type: "SET_CART", cart: updatedCart });
      } catch {
        dispatch({ type: "SET_CART", cart: snapshotRef.current! });
        dispatch({
          type: "SET_ERROR",
          error: "No se pudo actualizar el carrito. Intenta de nuevo.",
        });
      }
    },
    [state.cart]
  );

  const handleRemoveCartLine = useCallback(
    async (lineId: string) => {
      snapshotRef.current = state.cart;
      try {
        const updatedCart = await removeCartLine(lineId);
        dispatch({ type: "SET_CART", cart: updatedCart });
      } catch {
        dispatch({ type: "SET_CART", cart: snapshotRef.current! });
        dispatch({
          type: "SET_ERROR",
          error: "No se pudo eliminar el producto. Intenta de nuevo.",
        });
      }
    },
    [state.cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart: state.cart,
        cartStatus: state.cartStatus,
        error: state.error,
        setError: (msg) => dispatch({ type: "SET_ERROR", error: msg }),
        addToCart: handleAddToCart,
        updateCartLine: handleUpdateCartLine,
        removeCartLine: handleRemoveCartLine,
        isOpen: state.isOpen,
        openCart: () => dispatch({ type: "OPEN_CART" }),
        closeCart: () => dispatch({ type: "CLOSE_CART" }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
