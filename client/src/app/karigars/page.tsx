"use client";

import { Edit3, MoreHorizontal, Plus, Search, ToggleLeft, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { KarigarForm } from "@/components/karigars/karigar-form";
import { Message } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  createKarigar,
  getKarigars,
  updateKarigar,
  updateKarigarStatus,
  type Karigar,
  type KarigarInput,
} from "@/lib/api";

type ActiveFilter = "all" | "true" | "false";

export default function KarigarsPage() {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingKarigar, setEditingKarigar] = useState<Karigar>();
  const [saving, setSaving] = useState(false);

  const loadKarigars = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getKarigars({
        search: search.trim(),
        isActive: activeFilter === "all" ? "all" : activeFilter === "true",
      });
      setKarigars(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load karigars.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadKarigars(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadKarigars]);

  function openCreateForm() {
    setEditingKarigar(undefined);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(karigar: Karigar) {
    setEditingKarigar(karigar);
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(data: KarigarInput) {
    setSaving(true);
    setFormError("");
    try {
      if (editingKarigar) {
        await updateKarigar(editingKarigar.id, data);
        setNotice("Karigar details updated successfully.");
      } else {
        await createKarigar(data);
        setNotice("Karigar created successfully.");
      }
      setFormOpen(false);
      await loadKarigars();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Unable to save karigar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(karigar: Karigar) {
    setNotice("");
    try {
      await updateKarigarStatus(karigar.id, !karigar.isActive);
      setNotice(`${karigar.name} is now ${karigar.isActive ? "inactive" : "active"}.`);
      await loadKarigars();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update karigar status.");
    }
  }

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1400px] space-y-7">
        <header className="flex flex-col justify-between gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">Master data</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Karigar Master</h1><p className="mt-2 text-sm text-stone-500">Manage workshop goldsmiths and agreed wastage.</p></div>
          <Button type="button" onClick={openCreateForm}><Plus size={17} className="mr-2" /> Add Karigar</Button>
        </header>
        {notice ? <Message variant="success">{notice}</Message> : null}
        <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm text-stone-500 focus-within:border-amber-600 lg:max-w-md"><Search size={17} className="shrink-0 text-stone-400" /><span className="sr-only">Search karigars</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or code" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400" /></label>
            <div className="flex items-center gap-2"><span className="text-sm text-stone-500">Status</span>{(["all", "true", "false"] as ActiveFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeFilter === filter ? "bg-stone-950 text-white" : "text-stone-500 hover:bg-stone-100"}`}>{filter === "all" ? "All" : filter === "true" ? "Active" : "Inactive"}</button>)}</div>
          </div>
        </section>
        {error ? <Message>{error}</Message> : null}
        {loading ? <LoadingTable /> : karigars.length === 0 ? <EmptyKarigars onAdd={openCreateForm} /> : <KarigarTable karigars={karigars} onEdit={openEditForm} onStatusChange={handleStatusChange} />}
        <p className="flex items-center justify-center gap-2 text-xs text-stone-400"><UsersRound size={15} /> Wastage rules are editable per item category.</p>
      </div>
      {formOpen ? <KarigarForm karigar={editingKarigar} saving={saving} error={formError} onClose={() => { if (!saving) setFormOpen(false); }} onSubmit={handleSubmit} /> : null}
    </ProtectedShell>
  );
}

function KarigarTable({ karigars, onEdit, onStatusChange }: { karigars: Karigar[]; onEdit: (karigar: Karigar) => void; onStatusChange: (karigar: Karigar) => Promise<void> }) {
  return <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold">Karigar directory</h2><p className="mt-1 text-xs text-stone-500">{karigars.length} record{karigars.length === 1 ? "" : "s"} found</p></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-stone-50 text-xs font-medium text-stone-500"><tr><th className="px-5 py-3">Karigar Code</th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Wastage Categories</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-stone-100">{karigars.map((karigar) => <tr key={karigar.id} className="text-stone-700"><td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-medium text-stone-900">{karigar.karigarCode}</td><td className="whitespace-nowrap px-5 py-4 font-medium text-stone-900">{karigar.name}</td><td className="whitespace-nowrap px-5 py-4 text-stone-500">{karigar.phone}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{karigar.wastageRules.map((rule) => <span key={rule.id ?? rule.itemCategory} className="rounded-full bg-[#f7f1df] px-2 py-1 text-xs text-[#80621f]">{rule.itemCategory} {Number(rule.allowedWastagePercent).toFixed(2)}%</span>)}</div></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${karigar.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{karigar.isActive ? "Active" : "Inactive"}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => onEdit(karigar)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label={`Edit ${karigar.name}`}><Edit3 size={16} /></button><button type="button" onClick={() => void onStatusChange(karigar)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label={`${karigar.isActive ? "Deactivate" : "Activate"} ${karigar.name}`}><ToggleLeft size={17} /></button><button type="button" disabled className="rounded-lg p-2 text-stone-300" aria-label="More actions"><MoreHorizontal size={17} /></button></div></td></tr>)}</tbody></table></div></section>;
}

function LoadingTable() {
  return <section className="rounded-xl border border-stone-200 bg-white p-8"><div className="flex items-center justify-center gap-3 text-sm text-stone-500"><div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#96752f]" /> Loading karigars...</div></section>;
}

function EmptyKarigars({ onAdd }: { onAdd: () => void }) {
  return <section className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><UsersRound className="mx-auto text-stone-300" size={28} /><h2 className="mt-3 font-semibold">No karigars found</h2><p className="mx-auto mt-2 max-w-md text-sm text-stone-500">Try changing your search or filters, or add the first workshop goldsmith.</p><Button type="button" variant="secondary" className="mt-5" onClick={onAdd}><Plus size={16} className="mr-2" /> Add Karigar</Button></section>;
}
