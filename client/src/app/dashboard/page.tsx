"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BriefcaseBusiness, Scale, UsersRound } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { DashboardCard, DashboardState } from "@/components/dashboard/dashboard-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { getDashboard, type DashboardData } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError(true));
  }, []);

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-8">
        <header className="border-b border-stone-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Overview</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">Workshop dashboard</h1>
          <p className="mt-2 text-sm text-stone-500">A live view of gold accountability across your workshop.</p>
        </header>
        {error ? <DashboardState type="error" /> : !data ? <DashboardState type="loading" /> : (
          <>
            <section aria-label="Workshop summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardCard label="Gold in Vault" value={data.summary.goldInVault} unit="g" detail="Current calculated closing stock" icon={Scale} />
              <DashboardCard label="Gold with Karigars" value={data.summary.goldWithKarigars} unit="g" detail="Outstanding issued fine gold" icon={UsersRound} trend="up" />
              <DashboardCard label="Open Jobs" value={String(data.summary.openJobs)} unit="jobs" detail="Open or partially returned" icon={BriefcaseBusiness} />
              <DashboardCard label="Items Needing Review" value={String(data.summary.itemsNeedingReview)} unit="items" detail={`${data.summary.pendingReturns} returns · ${data.summary.pendingWastageAlerts} wastage alerts`} icon={AlertCircle} trend="down" />
            </section>
            {data.transactions.length > 0 ? <RecentTransactions transactions={data.transactions} /> : <DashboardState type="empty" />}
          </>
        )}
      </div>
    </ProtectedShell>
  );
}
