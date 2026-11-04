import { ArrowUpRight, CircleAlert, Scale, UsersRound } from "lucide-react";
import Link from "next/link";
import { ProtectedShell } from "@/components/protected-shell";

export default function DashboardPage() {
  return (
    <ProtectedShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-medium text-amber-700">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Workshop dashboard
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            A calm view of the gold moving through your workshop.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric icon={Scale} label="Fine gold in control" value="—" detail="Connect an issue to begin" />
          <Metric icon={UsersRound} label="Active karigars" value="—" detail="Master data is ready" />
          <Metric icon={CircleAlert} label="Items to review" value="—" detail="No alerts loaded yet" />
        </div>
        <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold">Next step</p>
          <h2 className="mt-2 text-xl font-semibold">Set up your karigar master</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
            Add the people and agreed category wastage rules that make every
            future issue and receipt measurable.
          </p>
          <Link
            href="/karigars/new"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-700"
          >
            Add a karigar <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </ProtectedShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <Icon size={19} className="text-amber-700" />
      <p className="mt-6 text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-stone-400">{detail}</p>
    </div>
  );
}
