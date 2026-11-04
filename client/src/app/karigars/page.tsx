import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { ProtectedShell, EmptyRouteCard } from "@/components/protected-shell";
import { Button } from "@/components/ui/button";

export default function KarigarsPage() {
  return (
    <ProtectedShell>
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-amber-700">Master data</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Karigar master
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              Keep people, codes, and agreed wastage rules in one place.
            </p>
          </div>
          <Link href="/karigars/new">
            <Button>
              <Plus size={17} className="mr-2" /> Add karigar
            </Button>
          </Link>
        </div>
        <EmptyRouteCard
          title="No karigars loaded yet"
          description="The master list will show current balances and category rules once the karigar API is connected."
          href="/karigars/new"
          action="Add the first karigar"
        />
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <UsersRound size={15} /> Protected master data
        </div>
      </div>
    </ProtectedShell>
  );
}
