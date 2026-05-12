export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square animate-pulse rounded-2xl bg-[#21401d]/40" />
      <div className="flex flex-col gap-2 px-1">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#21401d]/40" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#21401d]/40" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
