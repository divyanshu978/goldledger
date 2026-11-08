import { ArrowDownLeft, ArrowUpRight, Clock3 } from "lucide-react";
import type { DashboardData } from "@/lib/api";

export function RecentTransactions({ transactions }: { transactions: DashboardData["transactions"] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-1 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-stone-900">Recent transactions</h2><p className="mt-1 text-xs text-stone-500">Latest activity from the database</p></div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f7f1df] px-2.5 py-1 text-[11px] font-medium text-[#80621f]"><Clock3 size={12} /> Latest 10</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Karigar</th><th className="px-5 py-3 text-right">Fine gold (g)</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {transactions.map((transaction) => {
              const isIncoming = transaction.stockEvent === "RECEIPT" || transaction.stockEvent === "ACCEPTED_RETURN" || transaction.stockEvent === "OPENING_STOCK";
              const type = transaction.returnType ? `Return · ${transaction.returnType.replaceAll("_", " ")}` : transaction.transactionType === "ISSUE" ? "Gold issue" : "Gold receipt";
              const status = transaction.reviewStatus === "PENDING_REVIEW" ? "Review" : transaction.reviewStatus === "REJECTED" ? "Rejected" : transaction.transactionType === "ISSUE" ? "Open" : "Recorded";
              return (
                <tr key={transaction.id} className="text-stone-700">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-stone-900">{transaction.reference}</td>
                  <td className="whitespace-nowrap px-5 py-4"><span className="inline-flex items-center gap-2">{isIncoming ? <ArrowDownLeft size={15} className="text-emerald-600" /> : <ArrowUpRight size={15} className="text-amber-700" />}{type}</span></td>
                  <td className="whitespace-nowrap px-5 py-4">{transaction.karigar.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums">{transaction.fineGold}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-500">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
