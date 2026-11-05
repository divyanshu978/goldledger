import Link from "next/link";
import { Plus, Search, UsersRound } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { Button } from "@/components/ui/button";

const karigars = [
  { code: "KAR-001", name: "Ramesh Kumar", phone: "+91 98765 43210", jobs: 4, balance: "32.450", status: "Active" },
  { code: "KAR-002", name: "Sanjay Verma", phone: "+91 98123 45678", jobs: 2, balance: "18.420", status: "Active" },
  { code: "KAR-003", name: "Amit Das", phone: "+91 98989 12345", jobs: 1, balance: "14.275", status: "Active" },
];

export default function KarigarsPage() {
  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-8">
        <header className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Master data</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Karigars</h1><p className="mt-2 text-sm text-stone-500">People currently handling gold issued by the workshop.</p></div>
          <Link href="/karigars/new"><Button><Plus size={17} className="mr-2" /> Add karigar</Button></Link>
        </header>
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-stone-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">Karigar directory</h2><p className="mt-1 text-xs text-stone-500">Seeded demo records · API connection pending</p></div>
            <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm text-stone-400 sm:w-64"><Search size={16} /><span>Search karigars</span></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Karigar</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3 text-right">Open jobs</th><th className="px-5 py-3 text-right">Gold with karigar (g)</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {karigars.map((karigar) => <tr key={karigar.code} className="text-stone-700"><td className="px-5 py-4"><p className="font-medium text-stone-900">{karigar.name}</p><p className="mt-1 text-xs text-stone-400">{karigar.code}</p></td><td className="px-5 py-4 text-stone-500">{karigar.phone}</td><td className="px-5 py-4 text-right tabular-nums">{karigar.jobs}</td><td className="px-5 py-4 text-right font-mono tabular-nums">{karigar.balance}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{karigar.status}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <p className="flex items-center justify-center gap-2 text-xs text-stone-400"><UsersRound size={15} /> Demo records are placeholders until connected to the karigar API.</p>
      </div>
    </ProtectedShell>
  );
}
