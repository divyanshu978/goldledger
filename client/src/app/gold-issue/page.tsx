"use client";

import Link from "next/link";
import { ArrowLeft, Calculator, FileInput } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Message } from "@/components/ui/alert";
import { getKarigars, issueGold, type Karigar } from "@/lib/api";

function previewFineGold(grossWeight: string, purity: string) {
  const weight = Number(grossWeight);
  const percentage = Number(purity);
  if (!Number.isFinite(weight) || !Number.isFinite(percentage) || weight <= 0 || percentage < 0 || percentage > 100) {
    return "—";
  }
  return (weight * percentage / 100).toFixed(3);
}

export default function GoldIssuePage() {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [karigarId, setKarigarId] = useState("");
  const [category, setCategory] = useState("NECKLACE");
  const [grossWeight, setGrossWeight] = useState("");
  const [purity, setPurity] = useState("91.60");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingKarigars, setLoadingKarigars] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getKarigars({ isActive: true, pageSize: 100 })
      .then((result) => setKarigars(result.items))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load karigars."))
      .finally(() => setLoadingKarigars(false));
  }, []);

  const fineGoldPreview = useMemo(() => previewFineGold(grossWeight, purity), [grossWeight, purity]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await issueGold({ karigarId, grossWeight, purity, category, dueDate, notes: notes.trim() || undefined });
      setSuccess(`Gold issued successfully. Job ${result.job.jobNumber} was created with ${result.transaction.fineWeight}g fine gold.`);
      setGrossWeight("");
      setNotes("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to issue gold.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-3xl space-y-7">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"><ArrowLeft size={16} /> Back to overview</Link>
        <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Gold movement</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Issue Gold</h1><p className="mt-2 text-sm text-stone-500">Issue fine gold to a karigar against a new workshop job.</p></header>
        <section className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8">
          {error ? <Message>{error}</Message> : null}
          {success ? <div className="mb-5"><Message variant="success">{success}</Message></div> : null}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><label htmlFor="issue-karigar" className="block text-sm font-medium text-stone-800">Karigar</label><select id="issue-karigar" required value={karigarId} onChange={(event) => setKarigarId(event.target.value)} disabled={saving || loadingKarigars} className="min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"><option value="">{loadingKarigars ? "Loading karigars..." : "Select a karigar"}</option>{karigars.map((karigar) => <option key={karigar.id} value={karigar.id}>{karigar.karigarCode} · {karigar.name}</option>)}</select></div>
              <div className="space-y-2"><label htmlFor="issue-category" className="block text-sm font-medium text-stone-800">Category</label><select id="issue-category" value={category} onChange={(event) => setCategory(event.target.value)} disabled={saving} className="min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"><option>NECKLACE</option><option>RING</option><option>CHAIN</option><option>BRACELET</option></select></div>
              <Field id="issue-gross-weight" label="Gross weight (g)" required type="text" inputMode="decimal" placeholder="120.000" value={grossWeight} onChange={(event) => setGrossWeight(event.target.value)} disabled={saving} />
              <Field id="issue-purity" label="Purity (%)" required type="text" inputMode="decimal" placeholder="91.60" value={purity} onChange={(event) => setPurity(event.target.value)} disabled={saving} />
              <Field id="issue-due-date" label="Due date" required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={saving} />
            </div>
            <div className="rounded-xl border border-[#eadfbd] bg-[#fcfaf3] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-stone-800"><Calculator size={17} className="text-[#96752f]" /> Fine-gold preview</div><p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-stone-950">{fineGoldPreview} <span className="text-sm font-sans font-normal text-stone-500">g</span></p><p className="mt-2 text-xs text-stone-500">Preview only. The backend recalculates and validates fine gold before saving.</p></div>
            <div className="space-y-2"><label htmlFor="issue-notes" className="block text-sm font-medium text-stone-800">Notes <span className="font-normal text-stone-400">(optional)</span></label><textarea id="issue-notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} placeholder="Add job instructions or context" className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base outline-none placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></div>
            <div className="flex justify-end border-t border-stone-200 pt-5"><Button type="submit" loading={saving} disabled={loadingKarigars || karigars.length === 0}><FileInput size={17} className="mr-2" /> Issue gold</Button></div>
          </form>
        </section>
      </div>
    </ProtectedShell>
  );
}
