import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function NewKarigarPage() {
  return (
    <ProtectedShell>
      <div className="max-w-2xl space-y-8">
        <Link
          href="/karigars"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft size={16} /> Back to karigar master
        </Link>
        <div>
          <p className="text-sm font-medium text-amber-700">Master data</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Add a karigar
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Capture the identity needed for accountable gold movement.
          </p>
        </div>
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="karigar-code" label="Karigar code" placeholder="KAR-002" disabled />
            <Field id="phone" label="Phone number" placeholder="9000000000" disabled />
            <Field id="name" label="Full name" placeholder="Karigar name" disabled className="sm:col-span-2" />
          </div>
          <p className="mt-5 text-sm text-stone-500">
            The create workflow will be connected when the karigar API is added.
          </p>
          <Button className="mt-6" disabled>
            Save karigar
          </Button>
        </section>
      </div>
    </ProtectedShell>
  );
}
