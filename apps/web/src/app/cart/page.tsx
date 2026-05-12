import { Header } from "@/components/home/header";
import { CartPageClient } from "@/components/shop/cart-page-client";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <main className="min-h-screen bg-[#222721] text-[#fffff3]">
      <Header />
      <div className="mx-auto max-w-[800px] px-6 py-12 md:px-10">
        <h1 className="font-serif text-4xl text-white md:text-5xl">Carrito</h1>
        <div className="mt-10">
          <CartPageClient />
        </div>
      </div>
    </main>
  );
}
