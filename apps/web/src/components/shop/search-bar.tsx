"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { normalizeSearchQuery } from "@/lib/shopify/helpers";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const q = normalizeSearchQuery(value);
        if (q.length < 2) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("q", q);
        router.push(`/search?${params.toString()}`);
      }, 300);
    },
    [router, searchParams]
  );

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Buscar productos..."
      className="w-full rounded-full border border-[#e0ddcf]/30 bg-transparent px-5 py-3 text-sm text-[#e0ddcf] placeholder:text-[#e0ddcf]/40 focus:border-[#408733] focus:outline-none"
    />
  );
}
