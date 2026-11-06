"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Boxes, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Message } from "@/components/ui/alert";
import { getStockStatement, type StockStatement } from "@/lib/api";

export default function StockStatementPage() {
  const [statement, setStatement] = useState<StockStatement>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getStockStatement()
        .then(setStatement)
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load stock statement."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-7">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"><ArrowLeft size={16} /> Back to overview</Link>
        <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Finance view</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Stock Statement</h1><p className="mt-2 text-sm text-stone-500">Fine-gold stock movement across the vault. Outstanding karigar gold is shown separately.</p></header>
        {loading ? <LoadingState /> : error ? <Message>{error}</Message> : statement ? <StatementView statement={statement} /> : <EmptyState />}
      </div>
    </ProtectedShell>
  );
}

function StatementView({ statement }: { statement: StockStatement }) {
  const cards = [
    ["Opening stock", statement.summary.openingStock, Scale],
    ["Received stock", statement.summary.receivedStock, ArrowDownLeft],
    ["Issued gold", statement.summary.issuedGold, ArrowUpRight],
    ["Accepted returns", statement.summary.acceptedReturns, ArrowDownLeft],
    ["Adjustments", statement.summary.adjustments, Scale],
    ["Closing stock", statement.summary.closingStock, Boxes],
  ] as const;
  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, Icon]) => <article key={label} className={`rounded-xl border bg-white p-5 ${label === "Closing stock" ? "border-[#d9c98f]" : "border-stone-200"}`}><div className="flex items-start justify-between"><p className="text-sm text-stone-500">{label}</p><Icon size={18} className="text-[#96752f]" /></div><p className="mt-5 font-mono text-2xl font-semibold tabular-nums">{value}<span className="ml-2 font-sans text-sm font-normal text-stone-500">g</span></p></article>)}</section>
    <div className="rounded-lg border border-[#eadfbd] bg-[#fcfaf3] px-4 py-3 text-sm text-stone-700">Gold currently outstanding with karigars: <span className="font-mono font-semibold">{statement.summary.outstandingWithKarigars}g</span>. This is not included in available vault closing stock.</div>
    {statement.transactions.length === 0 ? <EmptyState /> : <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold">Stock transaction history</h2><p className="mt-1 text-xs text-stone-500">Fine-gold values from auditable database transactions · newest first</p></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Transaction type</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Gross (g)</th><th className="px-5 py-3 text-right">Purity</th><th className="px-5 py-3 text-right">Fine gold (g)</th><th className="px-5 py-3">Job</th></tr></thead><tbody className="divide-y divide-stone-100">{statement.transactions.map((transaction) => <tr key={transaction.id} className="text-stone-700"><td className="whitespace-nowrap px-5 py-4 text-stone-500">{new Date(transaction.date).toLocaleDateString()}</td><td className="whitespace-nowrap px-5 py-4"><span className="inline-flex items-center gap-2">{transaction.stockEvent === "ISSUE" ? <ArrowUpRight size={15} className="text-amber-700" /> : <ArrowDownLeft size={15} className="text-emerald-600" />}{transaction.stockEvent.replaceAll("_", " ")}</span></td><td className="whitespace-nowrap px-5 py-4 font-medium text-stone-900">{transaction.reference}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{transaction.grossWeight}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{transaction.purity}%</td><td className="px-5 py-4 text-right font-mono tabular-nums">{transaction.fineGoldWeight}</td><td className="px-5 py-4"><p className="font-medium text-stone-800">{transaction.job.jobNumber}</p><p className="mt-1 text-xs text-stone-500">{transaction.job.category}</p></td></tr>)}</tbody></table></div></section>}
  </>;
}

function LoadingState() {
  return <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500"><div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#96752f]" />Loading stock statement...</div>;
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><h2 className="font-semibold">No stock transactions</h2><p className="mt-2 text-sm text-stone-500">Auditable stock movement will appear here once recorded.</p></div>;
}
