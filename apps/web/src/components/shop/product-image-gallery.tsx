"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import type { ShopifyImage } from "@/lib/shopify/types";
import { normalizeImageUrl } from "@/lib/shopify/helpers";

interface ProductImageGalleryProps {
  images: ShopifyImage[];
  title: string;
}

export function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    if (selectedIndex === prevIndexRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainImageRef.current,
        { opacity: 0, scale: 1.03 },
        { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }
      );
    });
    prevIndexRef.current = selectedIndex;
    return () => ctx.revert();
  }, [selectedIndex]);

  const currentImage = images[selectedIndex];

  if (!currentImage) return null;

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={mainImageRef}
        className="relative aspect-square overflow-hidden rounded-3xl bg-[#21401d]/20"
      >
        <Image
          src={normalizeImageUrl(currentImage.url)}
          alt={currentImage.altText ?? title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={[
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                i === selectedIndex
                  ? "border-[#408733]"
                  : "border-transparent hover:border-[#e0ddcf]/30",
              ].join(" ")}
            >
              <Image
                src={normalizeImageUrl(img.url)}
                alt={img.altText ?? `${title} ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
