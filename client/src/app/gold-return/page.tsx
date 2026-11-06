"use client";

import Link from "next/link";
import { ArrowLeft, Calculator, ImageUp, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Message } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { extractImageReading, getOutstandingJobs, returnGold, type OutstandingJob, type GoldReturnInput } from "@/lib/api";

function previewFineGold(grossWeight: string, purity: string) {
  const weight = Number(grossWeight);
  const percentage = Number(purity);
  if (!Number.isFinite(weight) || !Number.isFinite(percentage) || weight <= 0 || percentage < 0 || percentage > 100) return "—";
  return (weight * percentage / 100).toFixed(3);
}

export default function GoldReturnPage() {
  const [jobs, setJobs] = useState<OutstandingJob[]>([]);
  const [jobId, setJobId] = useState("");
  const [returnType, setReturnType] = useState<GoldReturnInput["returnType"]>("FINISHED_JEWELLERY");
  const [grossWeight, setGrossWeight] = useState("");
  const [purity, setPurity] = useState("91.60");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [image, setImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const result = await getOutstandingJobs();
      setJobs(result.jobs);
      setJobId((current) => result.jobs.some((job) => job.id === current) ? current : result.jobs[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load outstanding jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadJobs(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedJob = jobs.find((job) => job.id === jobId);
  const fineGoldPreview = useMemo(() => previewFineGold(grossWeight, purity), [grossWeight, purity]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) {
      setError("Confirm the weight and purity before submitting the return.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await returnGold({ jobId, returnType, grossWeight, purity, notes: notes.trim() || undefined });
      setSuccess(`Return recorded successfully. ${result.transaction.fineWeight}g fine gold was received.`);
      setGrossWeight("");
      setConfirmed(false);
      setAiSuggestion("");
      setNotes("");
      await loadJobs();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record gold return.");
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
      const selected = event.target.files?.[0];
      if (!selected) return;
      setImage(selected);
      setImagePreview(URL.createObjectURL(selected));
      setAiSuggestion("");
    }

  async function handleExtract() {
      if (!image) return;
      setExtracting(true);
      setError("");
      setAiSuggestion("");
      try {
        const result = await extractImageReading(image);
        setGrossWeight(result.suggestion.grossWeight);
        setPurity(result.suggestion.purity);
        setAiSuggestion(`AI suggestion${result.suggestion.confidence === null ? "" : ` · ${Math.round(result.suggestion.confidence * 100)}% confidence`}`);
        setConfirmed(false);
      } catch (extractError) {
        setError(extractError instanceof Error ? extractError.message : "Unable to read the image. Enter values manually.");
      } finally {
        setExtracting(false);
    }
  }

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-4xl space-y-7">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"><ArrowLeft size={16} /> Back to overview</Link>
        <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Gold movement</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Return Gold</h1><p className="mt-2 text-sm text-stone-500">Record finished jewellery, scrap, or filings returned against an open job.</p></header>
        {error ? <Message>{error}</Message> : null}
        {success ? <Message variant="success">{success}</Message> : null}
        {loading ? <LoadingState /> : jobs.length === 0 ? <EmptyState /> : (
          <section className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2"><label htmlFor="return-job" className="block text-sm font-medium text-stone-800">Job</label><select id="return-job" required value={jobId} onChange={(event) => setJobId(event.target.value)} disabled={saving} className="min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100">{jobs.map((job) => <option key={job.id} value={job.id}>{job.jobNumber} · {job.karigar.name} · Outstanding {job.outstandingFineGold}g</option>)}</select></div>
              {selectedJob ? <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-stone-500">Karigar</p><p className="mt-1 font-medium">{selectedJob.karigar.code} · {selectedJob.karigar.name}</p></div><div><p className="text-xs text-stone-500">Category</p><p className="mt-1 font-medium">{selectedJob.category}</p></div><div><p className="text-xs text-stone-500">Outstanding fine gold</p><p className="mt-1 font-mono font-semibold tabular-nums">{selectedJob.outstandingFineGold}g</p></div></div> : null}
              <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="return-type" className="block text-sm font-medium text-stone-800">Return type</label><select id="return-type" value={returnType} onChange={(event) => setReturnType(event.target.value as GoldReturnInput["returnType"])} disabled={saving} className="min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"><option value="FINISHED_JEWELLERY">Finished jewellery</option><option value="SCRAP">Scrap</option><option value="FILINGS">Filings</option></select></div><Field id="return-gross-weight" label="Gross weight (g)" required type="text" inputMode="decimal" placeholder="10.000" value={grossWeight} onChange={(event) => setGrossWeight(event.target.value)} disabled={saving} /><Field id="return-purity" label="Purity (%)" required type="text" inputMode="decimal" placeholder="91.60" value={purity} onChange={(event) => setPurity(event.target.value)} disabled={saving} /></div>
              <section className="rounded-xl border border-stone-200 bg-stone-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-stone-800"><ImageUp size={17} className="text-[#96752f]" /> AI-assisted scale reading</div><p className="mt-1 text-xs text-stone-500">Upload a clear JPEG, PNG, or WebP photo. The result is a suggestion only; review and edit it before submitting.</p><div className="mt-4 flex flex-wrap items-center gap-3"><input id="return-reading-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} disabled={saving || extracting} className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-stone-700 sm:w-auto" /><Button type="button" variant="secondary" onClick={() => void handleExtract()} disabled={!image || saving} loading={extracting}>Read image</Button></div>{imagePreview ? <img src={imagePreview} alt="Uploaded scale reading preview" className="mt-4 max-h-48 rounded-lg border border-stone-200 object-contain" /> : null}{aiSuggestion ? <p className="mt-3 text-xs font-medium text-amber-800">{aiSuggestion} · Values below are AI suggestions and remain editable.</p> : null}</section>
              <div className="rounded-xl border border-[#eadfbd] bg-[#fcfaf3] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-stone-800"><Calculator size={17} className="text-[#96752f]" /> Fine-gold calculation</div><div className="mt-3 flex flex-wrap items-baseline justify-between gap-3"><p className="font-mono text-3xl font-semibold tabular-nums">{fineGoldPreview} <span className="text-sm font-sans font-normal text-stone-500">g returned</span></p><p className="text-sm text-stone-500">Remaining after return: <span className="font-mono font-semibold">{selectedJob && fineGoldPreview !== "—" ? Math.max(0, Number(selectedJob.outstandingFineGold) - Number(fineGoldPreview)).toFixed(3) : "—"}g</span></p></div><p className="mt-2 text-xs text-stone-500">Preview only. The backend validates the outstanding balance before saving.</p></div>
              <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={saving} className="mt-1" />I have reviewed and confirmed the gross weight and purity. These values are ready for return submission.</label>
              <div className="space-y-2"><label htmlFor="return-notes" className="block text-sm font-medium text-stone-800">Notes <span className="font-normal text-stone-400">(optional)</span></label><textarea id="return-notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} placeholder="Add return context" className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base outline-none placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></div>
              <div className="flex justify-end border-t border-stone-200 pt-5"><Button type="submit" loading={saving}><PackageCheck size={17} className="mr-2" /> Record return</Button></div>
            </form>
          </section>
        )}
      </div>
    </ProtectedShell>
  );
}

function LoadingState() {
  return <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500"><div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#96752f]" />Loading outstanding jobs...</div>;
}

function EmptyState() {
  return <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><h2 className="font-semibold">No outstanding jobs</h2><p className="mt-2 text-sm text-stone-500">Jobs with gold awaiting return will appear here.</p></div>;
}
