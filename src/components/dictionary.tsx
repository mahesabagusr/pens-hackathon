"use client";

import { useState } from "react";
import type { Entry } from "~/server/landing";
import { AskButton } from "./chat";

const KINDS = [
  { value: "", label: "Semua" },
  { value: "diskon", label: "Diskon" },
  { value: "pengecualian", label: "Pengecualian" },
  { value: "janji_fitur", label: "Janji fitur" },
  { value: "eskalasi", label: "Eskalasi" },
];
const NOUN: Record<string, string> = { diskon: "diskon", pengecualian: "pengecualian", janji_fitur: "janji fitur", eskalasi: "eskalasi" };
const DOT: Record<string, string> = { Disetujui: "bg-ok", Ditolak: "bg-danger", Menunggu: "bg-warn" };
const PREVIEW = 8;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function Dictionary({ entries }: { entries: Entry[] }) {
  const [kind, setKind] = useState("");
  const [all, setAll] = useState(false);
  const shown = entries.filter((e) => !kind || e.tipe === kind);
  const visible = all ? shown : shown.slice(0, PREVIEW);

  return (
    <div>
      <div role="group" aria-label="Saring menurut jenis keputusan" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={kind === k.value}
            onClick={() => setKind(k.value)}
            className={`min-h-11 cursor-pointer rounded-md border px-4 text-sm transition-colors duration-150 ${
              kind === k.value ? "border-accent bg-accent font-medium text-black" : "border-line text-muted hover:border-white/50 hover:text-ink"
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
            {e.statusJanji && <p className="mt-1 text-sm">Status janji: {e.statusJanji}</p>}
            <p className="mt-2 text-sm text-muted">
              {e.id} · {when(e.tanggal)} · {e.akun} · diminta {e.diminta} · diputuskan {e.diputuskan}
            </p>
            <AskButton
              question={`Ceritakan keputusan ${e.id}: siapa yang terlibat, kenapa diambil, dan apa yang terjadi sesudahnya.`}
              className="mt-2 min-h-11 cursor-pointer text-sm text-accent underline-offset-4 hover:underline"
            >
              Tanya chat tentang {e.id}
            </AskButton>
          </li>
        ))}
        {visible.length === 0 && <li className="py-5 text-muted">Tidak ada keputusan jenis ini di log.</li>}
      </ol>

      {shown.length > PREVIEW && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll(!all)}
          className="mt-4 min-h-11 cursor-pointer rounded-md border border-line px-4 text-sm transition-colors duration-150 hover:border-white/50"
        >
          {all ? "Tampilkan lebih sedikit" : `Tampilkan semua ${shown.length}`}
        </button>
      )}
    </div>
  );
}
