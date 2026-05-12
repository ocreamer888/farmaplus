import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/shop/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FarmaPlus",
  description: "FarmaPlus web application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cartId = (await cookies()).get("cartId")?.value;

  return (
    <html lang="es">
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <Providers cartId={cartId}>{children}</Providers>
      </body>
    </html>
  );
}
