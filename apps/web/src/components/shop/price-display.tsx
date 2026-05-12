interface PriceDisplayProps {
  crc: string;
  usd: string;
  compareCrc?: string;
  compareUsd?: string;
}

export function PriceDisplay({ crc, usd, compareCrc, compareUsd }: PriceDisplayProps) {
  const onSale = Boolean(compareCrc);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-[#e0ddcf]">{crc}</span>
        {onSale && (
          <span className="rounded-full bg-[#408733] px-2 py-0.5 text-xs text-white">
            Oferta
          </span>
        )}
      </div>
      <span className="text-sm text-[#e0ddcf]/50">{usd}</span>
      {compareCrc && (
        <span className="text-sm text-[#e0ddcf]/40 line-through">
          {compareCrc} <span className="text-xs">({compareUsd})</span>
        </span>
      )}
    </div>
  );
}
