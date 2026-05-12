"use server";

import { cookies } from "next/headers";
import { shopifyFetch } from "../client";
import { CART_FRAGMENT } from "./cart";
import type { Cart } from "../types";

const CREATE_CART_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

const ADD_LINES_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

const UPDATE_LINES_MUTATION = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

const REMOVE_LINES_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FRAGMENT} }
      userErrors { field message }
    }
  }
`;

type UserError = { field: string[]; message: string };

function assertNoUserErrors(userErrors: UserError[]): void {
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join(", "));
  }
}

async function setCartCookie(cartId: string): Promise<void> {
  (await cookies()).set("cartId", cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function createCart(): Promise<Cart> {
  const { data } = await shopifyFetch<{
    cartCreate: { cart: Cart; userErrors: UserError[] };
  }>({
    query: CREATE_CART_MUTATION,
    variables: { input: {} },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartCreate.userErrors);
  await setCartCookie(data.cartCreate.cart.id);
  return data.cartCreate.cart;
}

export async function addToCart(
  variantId: string,
  quantity: number
): Promise<Cart> {
  const cookieStore = await cookies();
  let cartId = cookieStore.get("cartId")?.value;

  if (!cartId) {
    const newCart = await createCart();
    cartId = newCart.id;
  }

  const { data } = await shopifyFetch<{
    cartLinesAdd: { cart: Cart; userErrors: UserError[] };
  }>({
    query: ADD_LINES_MUTATION,
    variables: { cartId, lines: [{ merchandiseId: variantId, quantity }] },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartLinesAdd.userErrors);
  return data.cartLinesAdd.cart;
}

export async function updateCartLine(
  lineId: string,
  quantity: number
): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) throw new Error("No cart found");

  const { data } = await shopifyFetch<{
    cartLinesUpdate: { cart: Cart; userErrors: UserError[] };
  }>({
    query: UPDATE_LINES_MUTATION,
    variables: { cartId, lines: [{ id: lineId, quantity }] },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartLinesUpdate.userErrors);
  return data.cartLinesUpdate.cart;
}

export async function removeCartLine(lineId: string): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) throw new Error("No cart found");

  const { data } = await shopifyFetch<{
    cartLinesRemove: { cart: Cart; userErrors: UserError[] };
  }>({
    query: REMOVE_LINES_MUTATION,
    variables: { cartId, lineIds: [lineId] },
    cache: "no-store",
  });
  assertNoUserErrors(data.cartLinesRemove.userErrors);
  return data.cartLinesRemove.cart;
}
