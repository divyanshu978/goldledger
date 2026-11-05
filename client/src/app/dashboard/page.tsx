import { AlertCircle, BriefcaseBusiness, Scale, UsersRound } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

export default function DashboardPage() {
  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-8">
        <header className="flex flex-col gap-3 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Overview</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">Workshop dashboard</h1><p className="mt-2 text-sm text-stone-500">A clear view of gold accountability across your workshop.</p></div>
          <span className="w-fit rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500">Demo workspace · 05 Nov 2026</span>
        </header>
        <section aria-label="Workshop summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard label="Gold in Vault" value="248.650" unit="g" detail="Opening demo balance" icon={Scale} />
          <DashboardCard label="Gold with Karigars" value="65.145" unit="g" detail="Across 3 active jobs" icon={UsersRound} trend="up" />
          <DashboardCard label="Open Jobs" value="12" unit="jobs" detail="3 due this week" icon={BriefcaseBusiness} />
          <DashboardCard label="Items Needing Review" value="3" unit="items" detail="Receipts awaiting review" icon={AlertCircle} trend="down" />
        </section>
        <RecentTransactions />
        <p className="text-center text-xs text-stone-400">The values above are seeded demo data and are not live business records.</p>
      </div>
    </ProtectedShell>
  );
}
