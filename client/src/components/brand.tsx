import { Scale } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <Scale size={20} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold tracking-tight text-stone-950">GoldLedger</p>
        {!compact ? (
          <p className="text-xs text-stone-500">Workshop control</p>
        ) : null}
      </div>
    </div>
  );
}
