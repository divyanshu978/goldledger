import { ArrowDownLeft, ArrowUpRight, Clock3 } from "lucide-react";

const transactions = [
  { id: "DEMO-1042", type: "Gold issue", karigar: "Ramesh Kumar", weight: "24.850", date: "05 Nov 2026", status: "Open", direction: "out" },
  { id: "DEMO-1041", type: "Gold receipt", karigar: "Sanjay Verma", weight: "18.420", date: "04 Nov 2026", status: "Review", direction: "in" },
  { id: "DEMO-1040", type: "Gold issue", karigar: "Amit Das", weight: "12.000", date: "04 Nov 2026", status: "Open", direction: "out" },
  { id: "DEMO-1039", type: "Gold receipt", karigar: "Ramesh Kumar", weight: "9.875", date: "03 Nov 2026", status: "Closed", direction: "in" },
];

export function RecentTransactions() {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-1 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-stone-900">Recent transactions</h2><p className="mt-1 text-xs text-stone-500">Seeded demo activity · API connection pending</p></div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f7f1df] px-2.5 py-1 text-[11px] font-medium text-[#80621f]"><Clock3 size={12} /> Last 7 days</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Karigar</th><th className="px-5 py-3 text-right">Fine gold (g)</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="text-stone-700">
                <td className="whitespace-nowrap px-5 py-4 font-medium text-stone-900">{transaction.id}</td>
                <td className="whitespace-nowrap px-5 py-4"><span className="inline-flex items-center gap-2">{transaction.direction === "in" ? <ArrowDownLeft size={15} className="text-emerald-600" /> : <ArrowUpRight size={15} className="text-amber-700" />}{transaction.type}</span></td>
                <td className="whitespace-nowrap px-5 py-4">{transaction.karigar}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right font-mono tabular-nums">{transaction.weight}</td>
                <td className="whitespace-nowrap px-5 py-4 text-stone-500">{transaction.date}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{transaction.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
