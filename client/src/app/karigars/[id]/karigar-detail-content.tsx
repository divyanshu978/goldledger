"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Scale } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Message } from "@/components/ui/alert";
import { getKarigarLedger, type KarigarLedger } from "@/lib/api";

export default function KarigarDetailContent() {
  const params = useParams<{ id: string }>();
  const [ledger, setLedger] = useState<KarigarLedger>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getKarigarLedger(params.id)
        .then(setLedger)
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load karigar ledger."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-7">
        <Link href="/karigars" className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"><ArrowLeft size={16} /> Back to karigar master</Link>
        {loading ? <LoadingState /> : error ? <Message>{error}</Message> : ledger ? <LedgerView ledger={ledger} /> : <EmptyState />}
      </div>
    </ProtectedShell>
  );
}

function LedgerView({ ledger }: { ledger: KarigarLedger }) {
  return <>
    <header className="flex flex-col gap-2 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Karigar ledger</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{ledger.karigar.name}</h1><p className="mt-2 text-sm text-stone-500">{ledger.karigar.karigarCode} · {ledger.karigar.phone}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${ledger.karigar.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{ledger.karigar.isActive ? "Active" : "Inactive"}</span></header>
    <section className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Fine gold issued" value={ledger.summary.totalFineGoldIssued} icon={ArrowUpRight} /><SummaryCard label="Fine gold returned" value={ledger.summary.totalFineGoldReturned} icon={ArrowDownLeft} /><SummaryCard label="Outstanding balance" value={ledger.summary.outstandingFineGold} icon={Scale} emphasis /></section>
    {ledger.transactions.length === 0 ? <EmptyState /> : <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold">Transaction history</h2><p className="mt-1 text-xs text-stone-500">Ordered newest first · Decimal values from the ledger API</p></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Type</th><th className="px-5 py-3 text-right">Gross (g)</th><th className="px-5 py-3 text-right">Purity</th><th className="px-5 py-3 text-right">Fine gold (g)</th><th className="px-5 py-3">Job / category</th><th className="px-5 py-3">Notes</th></tr></thead><tbody className="divide-y divide-stone-100">{ledger.transactions.map((transaction) => <tr key={transaction.id} className="text-stone-700"><td className="whitespace-nowrap px-5 py-4 text-stone-500">{new Date(transaction.date).toLocaleDateString()}</td><td className="whitespace-nowrap px-5 py-4"><span className="inline-flex items-center gap-2">{transaction.type === "ISSUE" ? <ArrowUpRight size={15} className="text-amber-700" /> : <ArrowDownLeft size={15} className="text-emerald-600" />}{transaction.type === "ISSUE" ? "Issue" : `Return · ${transaction.returnType?.replaceAll("_", " ")}`}</span></td><td className="px-5 py-4 text-right font-mono tabular-nums">{transaction.grossWeight}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{transaction.purity}%</td><td className="px-5 py-4 text-right font-mono tabular-nums">{transaction.fineGold}</td><td className="px-5 py-4"><p className="font-medium text-stone-800">{transaction.job.jobNumber}</p><p className="mt-1 text-xs text-stone-500">{transaction.job.category}</p></td><td className="max-w-[220px] px-5 py-4 text-stone-500">{transaction.notes ?? "—"}</td></tr>)}</tbody></table></div></section>}
  </>;
}

function SummaryCard({ label, value, icon: Icon, emphasis = false }: { label: string; value: string; icon: typeof Scale; emphasis?: boolean }) {
  return <article className={`rounded-xl border bg-white p-5 ${emphasis ? "border-[#d9c98f]" : "border-stone-200"}`}><div className="flex items-start justify-between"><p className="text-sm text-stone-500">{label}</p><Icon size={18} className="text-[#96752f]" /></div><p className="mt-5 font-mono text-2xl font-semibold tabular-nums">{value}<span className="ml-2 font-sans text-sm font-normal text-stone-500">g</span></p></article>;
}

function LoadingState() {
  return <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500"><div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#96752f]" />Loading ledger...</div>;
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><h2 className="font-semibold">No ledger activity</h2><p className="mt-2 text-sm text-stone-500">No issue or return transactions have been recorded for this karigar.</p></div>;
}
