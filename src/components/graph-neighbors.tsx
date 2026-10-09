"use client";

import Link from "next/link";
import type { NeighborGroup, NeighborResult } from "~/server/neighbors";
import { Icon } from "./icon";

export type NeighborState = NeighborResult | "loading" | { error: "auth" | "missing" | "down" | "failed" } | undefined;

type Props = {
  name: string; // label of the node being explored
  state: NeighborState;
  added: Set<string>; // group keys already on the canvas from this node
  fresh: (g: NeighborGroup) => { edges: number; nodes: number }; // what adding the group would put on the canvas
  room: number; // explored nodes left before the canvas limit
  onLoad: () => void;
  onAdd: (groups: NeighborGroup[]) => void;
  onRemove: (key: string) => void;
  onAsk?: (question: string) => void;
};

export const EXPLORE_LIMIT = 150;
const ARROW = { out: "→", in: "←", both: "↔" } as const;
const day = (d?: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "tanggal acuan";
const button =
  "inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors duration-150 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:opacity-40";

// "Tetangga di graf": loads a node's Neo4j neighbors as groups, and lets the user put chosen groups on the canvas.
export function GraphNeighbors({ name, state, added, fresh, room, onLoad, onAdd, onRemove, onAsk }: Props) {
  const result = typeof state === "object" && "groups" in state ? state : null;
  const error = typeof state === "object" && "error" in state ? state.error : null;
  const addable = result?.groups.filter((g) => !added.has(g.key) && fresh(g).edges > 0) ?? [];
  const addAll = addable.reduce((n, g) => n + fresh(g).nodes, 0);

  return (
    <div className="border-b border-line p-3">
      <h4 className="text-xs font-medium">Korelasi Lainnya</h4>

      {!result && (
        <button
          type="button"
          onClick={onLoad}
          disabled={state === "loading"}
          className={`${button} evidence-action-button graph-neighbors-action mt-2`}
        >
          {state === "loading" ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent motion-reduce:animate-none" aria-hidden />
          ) : (
            <Icon name="graph" className="size-3.5" />
          )}
          {state === "loading" ? "Memuat…" : "Lihat"}
        </button>
      )}

      {state === "loading" && (
        <ul className="mt-2 space-y-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-8 animate-pulse rounded-md bg-white/5 motion-reduce:animate-none" />
          ))}
        </ul>
      )}

      {error && (
        <div role="alert" className="mt-2 rounded-md border border-warn/50 p-2 text-xs">
          {error === "auth" ? (
            <>
              Sesi berakhir.{" "}
              <Link href="/login" className="text-accent underline">
                Masuk lagi
              </Link>
            </>
          ) : error === "missing" ? (
            <>{name} tidak ada di graf Neo4j. Muat ulang graf dengan npm run graph:load.</>
          ) : (
            <>
              {error === "down" ? "Graf Neo4j tidak bisa dihubungi." : "Gagal memuat tetangga (galat server, lihat log)."} Jalur bukti tetap bisa
              dipakai.{" "}
              <button type="button" onClick={onLoad} className="cursor-pointer text-accent underline">
                Coba lagi
              </button>
            </>
          )}
        </div>
      )}

      {result && (
        <>
          {!result.groups.length ? (
            <p className="mt-2 text-xs text-muted">Tidak ada tetangga lain sebelum {day(result.asOf)}.</p>
          ) : (
            !addable.length && !added.size && <p className="mt-2 text-xs text-muted">Semua tetangga sudah tampil.</p>
          )}
          {addable.some((g) => fresh(g).nodes > room) && (
            <p className="mt-2 text-xs text-warn">Batas {EXPLORE_LIMIT} node eksplorasi. Hapus sebagian dulu.</p>
          )}
          <ul className="mt-2 divide-y divide-line">
            {result.groups.map((g) => {
              const on = added.has(g.key);
              const f = fresh(g);
              const more = g.total - g.nodes.length;
              return (
                <li key={g.key} className="py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px]">{g.label}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted" title={g.type}>
                      {ARROW[g.direction]} {g.type}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">{more ? `${g.nodes.length} dari ${g.total}` : g.total}</span>
                    {on ? (
                      <button
                        type="button"
                        onClick={() => onRemove(g.key)}
                        aria-label={`Hapus ${g.label}, ${g.type}`}
                        className={`${button} border-white/60 bg-white/10`}
                      >
                        Hapus
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAdd([g])}
                        disabled={!f.edges || f.nodes > room}
                        aria-label={f.edges ? `Tambah ${g.nodes.length} ${g.label}, ${g.type}` : `${g.label}, ${g.type} sudah tampil`}
                        className={`${button} border-line hover:border-white/50`}
                      >
                        {f.edges ? "Tambah" : "Sudah tampil"}
                      </button>
                    )}
                  </div>
                  {more > 0 && onAsk && (
                    <button
                      type="button"
                      onClick={() => onAsk(`Tampilkan semua ${g.label} yang terhubung ke ${name} lewat ${g.type} sampai ${result.asOf}.`)}
                      className="mt-0.5 inline-flex min-h-7 cursor-pointer items-center gap-1 text-[11px] text-accent hover:underline pointer-coarse:min-h-11"
                    >
                      <Icon name="chat" className="size-3" /> Tanya chat tentang {more} lainnya
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {addable.length > 1 && addAll > 0 && addAll <= 40 && addAll <= room && (
              <button type="button" onClick={() => onAdd(addable)} className={`${button} border-line hover:border-white/50`}>
                Tambah semua ({addAll})
              </button>
            )}
            {result.hidden > 0 && (
              <p className="text-[11px] text-muted">
                {result.hidden} tetangga setelah {day(result.asOf)} disembunyikan.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
