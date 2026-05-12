"use client";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#e0ddcf]/30 px-3 py-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Reducir cantidad"
        className="flex h-6 w-6 items-center justify-center text-[#e0ddcf] disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-sm text-[#e0ddcf]">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
        className="flex h-6 w-6 items-center justify-center text-[#e0ddcf] disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
