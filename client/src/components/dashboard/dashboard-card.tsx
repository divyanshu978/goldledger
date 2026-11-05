import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  label: string;
  value: string;
  unit: string;
  detail: string;
  icon: LucideIcon;
  trend?: "up" | "down";
};

export function DashboardCard({ label, value, unit, detail, icon: Icon, trend }: DashboardCardProps) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.03)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <div className="rounded-lg bg-[#f7f1df] p-2 text-[#96752f]"><Icon size={17} /></div>
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <p className="text-[28px] font-semibold tracking-tight tabular-nums text-stone-900">{value}</p>
        <span className="text-sm text-stone-500">{unit}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
        {trend === "up" ? <ArrowUpRight size={14} className="text-emerald-600" /> : null}
        {trend === "down" ? <ArrowDownRight size={14} className="text-amber-700" /> : null}
        <span>{detail}</span>
      </div>
    </article>
  );
}

export function DashboardState({ type }: { type: "loading" | "empty" | "error" }) {
  const content = {
    loading: { title: "Loading dashboard", description: "Fetching the latest workshop position." },
    empty: { title: "No activity yet", description: "Gold issues and receipts will appear here once recorded." },
    error: { title: "Dashboard unavailable", description: "We could not load the dashboard right now. Please try again." },
  }[type];
  return (
    <div className={cn("rounded-xl border bg-white p-10 text-center", type === "error" ? "border-red-200" : "border-stone-200")}>
      {type === "loading" ? <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-[#96752f]" /> : null}
      <h2 className="mt-3 font-semibold text-stone-800">{content.title}</h2>
      <p className="mt-1 text-sm text-stone-500">{content.description}</p>
    </div>
  );
}
