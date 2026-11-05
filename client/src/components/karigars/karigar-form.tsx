"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Message } from "@/components/ui/alert";
import type { Karigar, KarigarInput } from "@/lib/api";

type RuleDraft = { itemCategory: string; allowedWastagePercent: string };

const demoRules: RuleDraft[] = [
  { itemCategory: "Necklace", allowedWastagePercent: "3.00" },
  { itemCategory: "Ring", allowedWastagePercent: "2.00" },
  { itemCategory: "Chain", allowedWastagePercent: "2.50" },
];

export function KarigarForm({
  karigar,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  karigar?: Karigar;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: KarigarInput) => Promise<void>;
}) {
  const [name, setName] = useState(karigar?.name ?? "");
  const [phone, setPhone] = useState(karigar?.phone ?? "");
  const [karigarCode, setKarigarCode] = useState(karigar?.karigarCode ?? "");
  const [rules, setRules] = useState<RuleDraft[]>(
    karigar?.wastageRules.map((rule) => ({
      itemCategory: rule.itemCategory,
      allowedWastagePercent: rule.allowedWastagePercent,
    })) ?? demoRules,
  );
  const [validationError, setValidationError] = useState("");

  function updateRule(index: number, field: keyof RuleDraft, value: string) {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [field]: value } : rule));
  }

  function addRule() {
    setRules((current) => [...current, { itemCategory: "", allowedWastagePercent: "" }]);
  }

  function removeRule(index: number) {
    setRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const categories = rules.map((rule) => rule.itemCategory.trim().toLowerCase());
    if (!name.trim() || !phone.trim() || !karigarCode.trim()) {
      setValidationError("Name, phone, and karigar code are required.");
      return;
    }
    if (rules.length === 0 || rules.some((rule) => !rule.itemCategory.trim() || rule.allowedWastagePercent === "")) {
      setValidationError("Add a category and wastage percentage for every rule.");
      return;
    }
    if (new Set(categories).size !== categories.length) {
      setValidationError("Each wastage category must be unique.");
      return;
    }
    if (rules.some((rule) => Number(rule.allowedWastagePercent) < 0 || Number(rule.allowedWastagePercent) > 100 || Number.isNaN(Number(rule.allowedWastagePercent)))) {
      setValidationError("Wastage percentages must be between 0 and 100.");
      return;
    }
    setValidationError("");
    await onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      karigarCode: karigarCode.trim(),
      wastageRules: rules.map((rule) => ({
        itemCategory: rule.itemCategory.trim(),
        allowedWastagePercent: Number(rule.allowedWastagePercent),
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/30 p-0 sm:items-center sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="karigar-form-title" className="max-h-[min(90vh,760px)] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#96752f]">{karigar ? "Edit record" : "Master data"}</p><h2 id="karigar-form-title" className="mt-2 text-xl font-semibold">{karigar ? "Edit karigar" : "Add karigar"}</h2><p className="mt-1 text-sm text-stone-500">Manage identity details and agreed wastage rules.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Close form"><X size={19} /></button>
        </div>
        <form className="mt-7 space-y-6" onSubmit={handleSubmit}>
          {error ? <Message>{error}</Message> : null}
          {validationError ? <Message>{validationError}</Message> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="karigar-code" label="Karigar code" value={karigarCode} onChange={(event) => setKarigarCode(event.target.value)} placeholder="KAR-002" disabled={saving || Boolean(karigar)} />
            <Field id="karigar-name" label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" disabled={saving} />
            <Field id="karigar-phone" label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9000000000" disabled={saving} />
          </div>
          <div>
            <div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold">Wastage rules</h3><p className="mt-1 text-xs text-stone-500">Set the allowed percentage for each item category.</p></div><button type="button" onClick={addRule} disabled={saving} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#80621f] hover:text-[#5f4916]"><Plus size={16} /> Add rule</button></div>
            <div className="mt-4 space-y-3">
              {rules.map((rule, index) => <div key={`${index}-${rule.itemCategory}`} className="flex gap-2"><Field id={`category-${index}`} label={index === 0 ? "Category" : ""} value={rule.itemCategory} onChange={(event) => updateRule(index, "itemCategory", event.target.value)} placeholder="Necklace" disabled={saving} className="min-h-11" /><Field id={`percentage-${index}`} label={index === 0 ? "Allowed wastage" : ""} type="number" min="0" max="100" step="0.01" value={rule.allowedWastagePercent} onChange={(event) => updateRule(index, "allowedWastagePercent", event.target.value)} placeholder="3.00" disabled={saving} className="min-h-11" /><button type="button" onClick={() => removeRule(index)} disabled={saving || rules.length === 1} className="mt-7 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`Remove rule ${index + 1}`}><Trash2 size={17} /></button></div>)}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" loading={saving}>{karigar ? "Save changes" : "Create karigar"}</Button></div>
        </form>
      </section>
    </div>
  );
}
