"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Message } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getJobWastage,
  getWastageAlerts,
  resolveWastageAlert,
  submitWastageReview,
  type WastageItem,
} from "@/lib/api";

type Filter = "all" | "pending" | "resolved";

export default function WastageAlertsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<WastageItem[]>([]);
  const [selected, setSelected] = useState<(WastageItem & { transactions: Array<{ id: string; transactionId: string; type: string; returnType: string | null; grossWeight: string; purity: string; fineGold: string; notes: string | null; date: string }> })>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getWastageAlerts(filter);
      setItems(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load wastage alerts.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function inspect(item: WastageItem) {
    setError("");
    try {
      setSelected(await getJobWastage(item.job.id));
    } catch (inspectError) {
      setError(inspectError instanceof Error ? inspectError.message : "Unable to load job transactions.");
    }
  }

  async function submit(item: WastageItem) {
    setError("");
    try {
      await submitWastageReview(item.job.id);
      setMessage("Job submitted for finance review.");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit review.");
    }
  }

  async function resolve(item: WastageItem) {
    if (!item.alert) return;
    setError("");
    try {
      await resolveWastageAlert(item.alert.id);
      setMessage("Wastage alert resolved.");
      await load();
      if (selected?.job.id === item.job.id) setSelected(undefined);
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "Unable to resolve alert.");
    }
  }

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-7">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"><ArrowLeft size={16} /> Back to overview</Link>
        <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Finance review</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Wastage Alerts</h1><p className="mt-2 text-sm text-stone-500">Review category-specific wastage against fine gold issued and returned.</p></header>
        {message ? <Message variant="success">{message}</Message> : null}
        {error ? <Message>{error}</Message> : null}
        <div className="flex flex-wrap gap-2">
          {(["pending", "resolved", "all"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === value ? "bg-stone-950 text-white" : "border border-stone-200 bg-white text-stone-600"}`}>{value === "all" ? "All jobs" : value === "pending" ? "Pending review" : "Resolved alerts"}</button>)}
          <Button type="button" variant="ghost" onClick={() => void load()}><RefreshCw size={16} className="mr-2" /> Refresh</Button>
        </div>
        {loading ? <LoadingState /> : items.length === 0 ? <EmptyState filter={filter} /> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"><section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Job / karigar</th><th className="px-5 py-3">Category</th><th className="px-5 py-3 text-right">Issued</th><th className="px-5 py-3 text-right">Returned</th><th className="px-5 py-3 text-right">Allowed</th><th className="px-5 py-3 text-right">Excess</th><th className="px-5 py-3">State</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-stone-100">{items.map((item) => <tr key={item.job.id}><td className="px-5 py-4"><p className="font-semibold text-stone-900">{item.job.jobNumber}</p><p className="mt-1 text-xs text-stone-500">{item.job.karigar.code} · {item.job.karigar.name}</p></td><td className="px-5 py-4">{item.job.category}<p className="mt-1 text-xs text-stone-500">{item.job.appliedWastagePercent}% rule</p></td><td className="px-5 py-4 text-right font-mono tabular-nums">{item.issuedFineGold}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{item.returnedFineGold}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{item.allowedWastage}</td><td className={`px-5 py-4 text-right font-mono font-semibold tabular-nums ${item.excessWastage !== "0.000" ? "text-red-700" : "text-stone-700"}`}>{item.excessWastage}</td><td className="px-5 py-4"><StateBadge item={item} /></td><td className="px-5 py-4"><button type="button" onClick={() => void inspect(item)} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900"><Eye size={15} /> Inspect</button></td></tr>)}</tbody></table></div></section><DetailPanel item={selected} onSubmit={submit} onResolve={resolve} /></div>}
      </div>
    </ProtectedShell>
  );
}

function StateBadge({ item }: { item: WastageItem }) {
  if (item.excessWastage !== "0.000") return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><AlertTriangle size={13} /> Excess</span>;
  if (item.status === "PROVISIONAL") return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Provisional</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} /> Within limit</span>;
}

function DetailPanel({ item, onSubmit, onResolve }: { item?: WastageItem & { transactions: Array<{ id: string; transactionId: string; type: string; returnType: string | null; grossWeight: string; purity: string; fineGold: string; notes: string | null; date: string }> }; onSubmit: (item: WastageItem) => void; onResolve: (item: WastageItem) => void }) {
  if (!item) return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Select a job to inspect its transactions.</div>;
  return <aside className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">{item.job.jobNumber}</h2><p className="mt-1 text-sm text-stone-500">{item.job.karigar.name} · {item.job.category}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm">{[["Issued", item.issuedFineGold], ["Returned", item.returnedFineGold], ["Allowed", item.allowedWastage], ["Difference", item.actualDifference], ["Excess", item.excessWastage]].map(([label, value]) => <div key={label} className="rounded-lg bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-mono font-semibold tabular-nums">{value}g</p></div>)}</div><p className="mt-5 text-xs font-semibold uppercase tracking-wide text-stone-500">Transactions</p><div className="mt-2 divide-y divide-stone-100">{item.transactions.map((transaction) => <div key={transaction.id} className="py-3 text-sm"><div className="flex justify-between"><span className="font-medium">{transaction.type} · {transaction.transactionId}</span><span className="font-mono">{transaction.fineGold}g</span></div><p className="mt-1 text-xs text-stone-500">{transaction.grossWeight}g gross · {transaction.purity}% purity</p></div>)}</div>{item.status === "PROVISIONAL" ? <Button type="button" className="mt-5 w-full" onClick={() => onSubmit(item)}>Submit for finance review</Button> : null}{item.alert?.status === "PENDING" ? <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => onResolve(item)}>Resolve alert</Button> : null}</aside>;
}

function LoadingState() { return <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Loading wastage reviews...</div>; }
function EmptyState({ filter }: { filter: Filter }) { return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><h2 className="font-semibold">No {filter === "all" ? "" : filter + " "}wastage reviews</h2><p className="mt-2 text-sm text-stone-500">Jobs and excess-wastage alerts will appear here as returns are recorded.</p></div>; }
