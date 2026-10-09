"use client";

import { useState } from "react";
import type { Entry } from "~/server/landing";
import { AskButton } from "./chat";

const KINDS = [
  { value: "", label: "All" },
  { value: "diskon", label: "Discounts" },
  { value: "pengecualian", label: "Exceptions" },
  { value: "janji_fitur", label: "Feature promises" },
  { value: "eskalasi", label: "Escalations" },
];
const NOUN: Record<string, string> = { diskon: "discount", pengecualian: "exception", janji_fitur: "feature promise", eskalasi: "escalation" };
const DOT: Record<string, string> = { Disetujui: "bg-ok", Ditolak: "bg-danger", Menunggu: "bg-warn" };
const PREVIEW = 8;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function Dictionary({ entries }: { entries: Entry[] }) {
  const [kind, setKind] = useState("");
  const [all, setAll] = useState(false);
  const shown = entries.filter((e) => !kind || e.tipe === kind);
  const visible = all ? shown : shown.slice(0, PREVIEW);

  return (
    <div>
      <div role="group" aria-label="Filter by decision type" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={kind === k.value}
            onClick={() => setKind(k.value)}
            className={`min-h-11 rounded-[10px] border px-4 text-sm ${
              kind === k.value ? "border-accent bg-accent font-medium text-black" : "border-line bg-white hover:border-ink"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <ol className="mt-6 divide-y divide-line border-y border-line">
        {visible.map((e) => (
          <li key={e.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-display text-2xl">
                {e.headword}
                <span className="ml-2 font-sans text-base italic text-muted">{NOUN[e.tipe]}</span>
              </h3>
              <p className="flex items-center gap-2 text-sm">
                <span className={`size-2 rounded-full ${DOT[e.keputusan]}`} aria-hidden />
                {e.keputusan}
              </p>
            </div>
            <p className="mt-2 max-w-prose">{e.alasan}</p>
            {e.statusJanji && <p className="mt-1 text-sm">Promise status: {e.statusJanji}</p>}
            <p className="mt-2 text-sm text-muted">
              {e.id} · {when(e.tanggal)} · {e.akun} · asked by {e.diminta} · decided by {e.diputuskan}
            </p>
            <AskButton
              question={`Tell me about decision ${e.id}: who was involved, why it was made, and what happened next.`}
              className="mt-2 min-h-11 text-sm underline underline-offset-4 hover:no-underline"
            >
              Ask the graph about {e.id}
            </AskButton>
          </li>
        ))}
        {visible.length === 0 && <li className="py-5 text-muted">No decisions of this type in the log.</li>}
      </ol>

      {shown.length > PREVIEW && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll(!all)}
          className="mt-4 min-h-11 rounded-[10px] border border-line bg-white px-4 text-sm hover:border-ink"
        >
          {all ? "Show fewer" : `Show all ${shown.length}`}
        </button>
      )}
    </div>
  );
}
