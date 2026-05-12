import Link from "next/link";
import type { ShopifyCollection } from "@/lib/shopify/types";

interface CollectionNavProps {
  collections: ShopifyCollection[];
  activeHandle?: string;
}

export function CollectionNav({ collections, activeHandle }: CollectionNavProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto">
      <Link
        href="/products"
        className={[
          "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
          !activeHandle
            ? "border-[#408733] bg-[#408733] text-white"
            : "border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60",
        ].join(" ")}
      >
        Todos
      </Link>
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/collections/${col.handle}`}
          className={[
            "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
            col.handle === activeHandle
              ? "border-[#408733] bg-[#408733] text-white"
              : "border-[#e0ddcf]/30 text-[#e0ddcf] hover:border-[#e0ddcf]/60",
          ].join(" ")}
        >
          {col.title}
        </Link>
      ))}
    </nav>
  );
}
