import { Scale } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16 text-stone-950">
      <section className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Scale aria-hidden="true" size={24} strokeWidth={1.8} />
        </div>
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
          Goldledger
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Fine gold, clearly accounted for.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
          Workshop gold control for issues, receipts, wastage, and balances.
          The foundation is ready for the first end-to-end workflow.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm text-stone-600">
          <span className="rounded-full bg-stone-100 px-4 py-2">Next.js</span>
          <span className="rounded-full bg-stone-100 px-4 py-2">Express</span>
          <span className="rounded-full bg-stone-100 px-4 py-2">Prisma</span>
        </div>
      </section>
    </main>
  );
}
