"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { ProtectedShell, EmptyRouteCard } from "@/components/protected-shell";

export default function KarigarDetailContent() {
  const params = useParams<{ id: string }>();

  return (
    <ProtectedShell>
      <div className="space-y-8">
        <Link
          href="/karigars"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft size={16} /> Back to karigar master
        </Link>
        <div>
          <p className="text-sm font-medium text-amber-700">Karigar profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {params.id}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Balance and transaction history will appear here.
          </p>
        </div>
        <EmptyRouteCard
          title="Profile data is not connected yet"
          description="This protected route is ready for the karigar detail API and fine-gold balance view."
        />
      </div>
    </ProtectedShell>
  );
}
