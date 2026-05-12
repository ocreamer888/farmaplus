export function CollectionNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-[#21401d]/40"
        />
      ))}
    </div>
  );
}
