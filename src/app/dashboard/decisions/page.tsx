import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Dictionary } from "~/components/dictionary";
import { currentUser } from "~/server/auth";
import { dictionaryEntries } from "~/server/landing";

export const metadata: Metadata = { title: "Log keputusan | Decidely" };

export default function DecisionsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl">Log keputusan</h1>
      <p className="mt-1 text-sm leading-7 text-muted">Setiap diskon, pengecualian, janji fitur, dan eskalasi, dengan siapa yang meminta dan memutuskan.</p>
      <div className="decision-log-content">
        <Suspense fallback={<p className="text-muted">Memuat log keputusan…</p>}>
          <Entries />
        </Suspense>
      </div>
    </div>
  );
}

async function Entries() {
  if (!(await currentUser().catch(() => null))) redirect("/login");
  const entries = await dictionaryEntries().catch(() => null);
  if (!entries)
    return (
      <p role="alert" className="rounded-xl border border-danger p-4">
        Database tidak bisa dihubungi. Jalankan <code>npm run db:up</code> dan <code>npm run db:load</code>, lalu muat ulang.
      </p>
    );
  return <Dictionary entries={entries} />;
}
