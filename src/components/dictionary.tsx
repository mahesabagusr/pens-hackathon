"use client";

import { useState } from "react";
import type { Entry } from "~/server/landing";
import { AskButton } from "./chat";
import { Icon } from "./icon";

const KINDS = [
  { value: "", label: "Semua" },
  { value: "diskon", label: "Diskon" },
  { value: "pengecualian", label: "Pengecualian" },
  { value: "janji_fitur", label: "Janji fitur" },
  { value: "eskalasi", label: "Eskalasi" },
];
const NOUN: Record<string, string> = { diskon: "Diskon", pengecualian: "Pengecualian", janji_fitur: "Janji fitur", eskalasi: "Eskalasi" };
const STATUS: Record<string, string> = { Disetujui: "approved", Ditolak: "rejected", Menunggu: "pending" };
const initials = (name: string) => name.split(",")[0].split(" ").slice(0, 2).map((part) => part[0]).join("");
const PREVIEW = 8;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function Dictionary({ entries }: { entries: Entry[] }) {
  const [kind, setKind] = useState("");
  const [all, setAll] = useState(false);
  const shown = entries.filter((e) => !kind || e.tipe === kind);
  const visible = all ? shown : shown.slice(0, PREVIEW);

  return (
    <div className="decision-dictionary">
      <div role="group" aria-label="Saring menurut jenis keputusan" className="account-tabs decision-filters">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={kind === k.value}
            onClick={() => setKind(k.value)}
            className={kind === k.value ? "is-active" : ""}
          >
            {k.label}<span className="decision-filter-count">{entries.filter((entry) => !k.value || entry.tipe === k.value).length}</span>
          </button>
        ))}
      </div>

      <ol className="decision-card-list">
        {visible.map((e) => (
          <li key={e.id} className="information-card decision-card">
            <header className="information-card-header decision-card-header">
              <h3>{e.headword}</h3>
              <div className="decision-card-badges">
                <span className="decision-kind-chip">{NOUN[e.tipe] ?? e.tipe}</span>
                <span className={`decision-status-chip ${STATUS[e.keputusan] ?? "pending"}`}>
                  <span aria-hidden="true" />{e.keputusan}
                </span>
              </div>
            </header>
            <div className="information-card-body">
              <p className="max-w-prose">{e.alasan}</p>
              {e.statusJanji && <p className="mt-2 text-sm text-muted">Status janji: {e.statusJanji}</p>}
              <footer className="decision-card-footer">
                <div className="decision-metadata">
                  <span className="decision-meta-label"><Icon name="book" />{e.id}</span>
                  <span className="decision-meta-label"><Icon name="calendar" />{when(e.tanggal)}</span>
                  <span className="decision-meta-label"><Icon name="building" />{e.akun}</span>
                  <span className="decision-meta-label decision-person" title={`Diminta oleh ${e.diminta}`}>
                    <span className="decision-person-avatar" aria-hidden="true">{initials(e.diminta)}</span><span>{e.diminta}</span>
                  </span>
                  <span className="decision-meta-label decision-person" title={`Diputuskan oleh ${e.diputuskan}`}>
                    <span className="decision-person-avatar" aria-hidden="true">{initials(e.diputuskan)}</span><span>{e.diputuskan.split(",")[0]}</span>
                  </span>
                </div>
                <div className="decision-card-action">
                <AskButton
                  question={`Ceritakan keputusan ${e.id}: siapa yang terlibat, kenapa diambil, dan apa yang terjadi sesudahnya.`}
                  className="decision-ask-button"
                >
                  Tanya AI <Icon name="chevron-right" />
                </AskButton>
                </div>
              </footer>
            </div>
          </li>
        ))}
        {visible.length === 0 && <li className="information-card p-5 text-muted">Tidak ada keputusan jenis ini di log.</li>}
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
