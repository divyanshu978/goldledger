"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Message } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  decideReturnReview,
  getPendingReturnReviews,
  getWastageAlerts,
  type ReturnReviewItem,
  type WastageItem,
} from "@/lib/api";

export default function FinanceReviewPage() {
  const [returns, setReturns] = useState<ReturnReviewItem[]>([]);
  const [alerts, setAlerts] = useState<WastageItem[]>([]);
  const [selected, setSelected] = useState<ReturnReviewItem>();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [returnResult, alertResult] = await Promise.all([
        getPendingReturnReviews(),
        getWastageAlerts("pending"),
      ]);
      setReturns(returnResult.items);
      setAlerts(alertResult.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load finance reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function decide(decision: "ACCEPTED" | "REJECTED") {
    if (!selected) return;
    if (decision === "REJECTED" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    if (!window.confirm(`Confirm ${decision === "ACCEPTED" ? "accepting" : "rejecting"} this return?`)) return;
    setError("");
    try {
      await decideReturnReview(selected.transaction.id, decision, reason.trim() || undefined);
      setMessage(`Return ${decision.toLowerCase()} successfully.`);
      setSelected(undefined);
      setReason("");
      await load();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unable to save review decision.");
    }
  }

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-7">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"><ArrowLeft size={16} /> Back to overview</Link>
        <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Finance controls</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Finance Review</h1><p className="mt-2 text-sm text-stone-500">Approve returned gold before it is added to available vault stock.</p></header>
        {message ? <Message variant="success">{message}</Message> : null}
        {error ? <Message>{error}</Message> : null}
        <div className="flex justify-end"><Button type="button" variant="ghost" onClick={() => void load()}><RefreshCw size={16} className="mr-2" /> Refresh</Button></div>
        {loading ? <LoadingState /> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]"><div className="space-y-5"><section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold">Pending returns</h2><p className="mt-1 text-xs text-stone-500">Returns remain outside vault stock until accepted.</p></div>{returns.length === 0 ? <EmptyState text="No returns are waiting for approval." /> : <div className="divide-y divide-stone-100">{returns.map((item) => <button key={item.id} type="button" onClick={() => { setSelected(item); setReason(""); }} className={`block w-full px-5 py-4 text-left hover:bg-stone-50 ${selected?.id === item.id ? "bg-amber-50/50" : ""}`}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-stone-900">{item.job.jobNumber} · {item.transaction.returnType.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-stone-500">{item.job.karigar.code} · {item.job.karigar.name}</p></div><p className="font-mono font-semibold tabular-nums">{item.transaction.fineGold}g</p></div></button>)}</div>}</section><section className="overflow-hidden rounded-xl border border-red-200 bg-white"><div className="border-b border-red-100 bg-red-50/50 px-5 py-4"><h2 className="flex items-center gap-2 font-semibold text-red-900"><AlertTriangle size={17} /> Pending wastage alerts</h2></div>{alerts.length === 0 ? <EmptyState text="No pending wastage alerts." /> : <div className="divide-y divide-stone-100">{alerts.map((item) => <div key={item.alert?.id ?? item.job.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold">{item.job.jobNumber} · {item.job.karigar.name}</p><p className="mt-1 text-sm text-red-700">Excess wastage: {item.excessWastage}g</p></div><Link href="/wastage-alerts" className="text-sm font-semibold text-amber-700">Inspect</Link></div>)}</div>}</section></div><ReviewPanel item={selected} reason={reason} onReasonChange={setReason} onDecide={decide} /></div>}
      </div>
    </ProtectedShell>
  );
}

function ReviewPanel({ item, reason, onReasonChange, onDecide }: { item?: ReturnReviewItem; reason: string; onReasonChange: (value: string) => void; onDecide: (decision: "ACCEPTED" | "REJECTED") => void }) {
  if (!item) return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Select a pending return to inspect its complete transaction history.</div>;
  return <aside className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">{item.job.jobNumber}</h2><p className="mt-1 text-sm text-stone-500">{item.job.karigar.name} · {item.job.category}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><Metric label="Fine gold returned" value={`${item.transaction.fineGold}g`} /><Metric label="Gross weight" value={`${item.transaction.grossWeight}g`} /><Metric label="Purity" value={`${item.transaction.purity}%`} /><Metric label="Type" value={item.transaction.returnType.replaceAll("_", " ")} /></div><h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-stone-500">Full transaction history</h3><div className="mt-2 divide-y divide-stone-100">{item.transactions.map((transaction) => <div key={transaction.id} className="py-3 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{transaction.type} · {transaction.transactionId}</span><span className="font-mono">{transaction.fineGold}g</span></div><p className="mt-1 text-xs text-stone-500">{transaction.grossWeight}g gross · {transaction.purity}% purity</p></div>)}</div><label className="mt-5 block text-sm font-medium">Rejection reason <span className="font-normal text-stone-400">(required to reject)</span><textarea rows={3} maxLength={500} value={reason} onChange={(event) => onReasonChange(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 outline-none focus:border-amber-600" /></label><div className="mt-4 grid grid-cols-2 gap-3"><Button type="button" onClick={() => onDecide("ACCEPTED")}><CheckCircle2 size={16} className="mr-2" /> Accept</Button><Button type="button" variant="secondary" onClick={() => onDecide("REJECTED")}><XCircle size={16} className="mr-2" /> Reject</Button></div></aside>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-mono text-sm font-semibold tabular-nums">{value}</p></div>; }
function LoadingState() { return <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Loading finance reviews...</div>; }
function EmptyState({ text }: { text: string }) { return <div className="p-8 text-center text-sm text-stone-500">{text}</div>; }
