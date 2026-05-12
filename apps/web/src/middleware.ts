import { NextResponse } from "next/server";

export function middleware(): NextResponse {
  return NextResponse.next();
}

// Only run middleware on shop routes — not on the landing page or static assets
export const config = {
  matcher: ["/products/:path*", "/collections/:path*", "/cart", "/search"],
};
