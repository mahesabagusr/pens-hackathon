"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Visual } from "~/server/chat-visuals";
import { useChat } from "./chat-provider";
import { EvidenceGraph } from "./evidence-graph";
import { Icon } from "./icon";

type Chart = Extract<Visual, { kind: "bar" | "line" }>;

const fmt = (n: number) => n.toLocaleString("id-ID");
const small =
  "inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md border border-line px-2 text-xs text-muted transition-colors duration-150 hover:border-white/50 hover:text-ink pointer-coarse:min-h-11";

export function ChatVisual({ v }: { v: Visual }) {
  const chat = useChat();
  const router = useRouter();
  const [asTable, setAsTable] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const scope = chat?.scope;
  const inGraph = v.kind === "graph" && scope ? v.nodes.map((n) => n.id).filter((id) => scope.graphIds.includes(id)) : [];

  useEffect(() => {
    if (expanded) dialog.current?.showModal();
  }, [expanded]);

  const body = (big: boolean) =>
    v.kind === "graph" ? (
      <EvidenceGraph compact nodes={v.nodes} edges={v.edges} evidence={[]} focusEvidence={[]} className={big ? "h-full" : "h-64"} />
    ) : v.kind === "table" ? (
      <DataTable columns={v.columns} rows={v.rows} total={v.total} big={big} />
    ) : asTable ? (
      <DataTable columns={[v.x, v.y]} rows={v.points.map((p) => [p.x, String(p.y)])} total={v.points.length} big={big} />
    ) : v.kind === "bar" ? (
      <BarChart c={v} />
    ) : (
      <LineChart c={v} />
    );

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-background">
      <figcaption className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2">
        <span className="mr-auto text-xs font-medium">{v.title}</span>
        {(v.kind === "bar" || v.kind === "line") && (
          <button type="button" className={small} aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
            {asTable ? "Tampilkan grafik" : "Tampilkan tabel"}
          </button>
        )}
        {inGraph.length > 0 && scope && (
          <button
            type="button"
            className={small}
            onClick={() => router.push(`/dashboard?q=${scope.accountId}&asof=${scope.asOf}&tab=graph&focus=${inGraph.join(",")}`)}
          >
            <Icon name="graph" className="size-3.5" /> Sorot di Jalur bukti
          </button>
        )}
        <button type="button" className={small} onClick={() => setExpanded(true)} aria-label={`Perbesar ${v.title}`}>
          <Icon name="expand" className="size-3.5" />
        </button>
      </figcaption>
      {body(false)}
      <dialog
        ref={dialog}
        onClose={() => setExpanded(false)}
        aria-label={v.title}
        className="m-auto h-[90dvh] w-[min(72rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-0 text-ink backdrop:bg-black/60"
      >
        {expanded && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
              <h2 className="text-sm font-medium">{v.title}</h2>
              <form method="dialog">
                <button aria-label="Tutup" className={`${small} border-transparent`}>
                  <Icon name="close" className="size-4" />
                </button>
              </form>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">{body(true)}</div>
          </div>
        )}
      </dialog>
    </figure>
  );
}

function DataTable({ columns, rows, total, big }: { columns: string[]; rows: string[][]; total: number; big: boolean }) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const sorted = sort
    ? [...rows].sort((a, b) => {
        const x = a[sort.col];
        const y = b[sort.col];
        const nx = Number(x);
        const ny = Number(y);
        const cmp = x !== "" && y !== "" && !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y, "id");
        return cmp * sort.dir;
      })
    : rows;
  return (
    <div>
      <div className={`overflow-auto ${big ? "" : "max-h-72"}`}>
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-panel text-muted">
            <tr>
              {columns.map((c, i) => (
                <th key={c} scope="col" aria-sort={sort?.col === i ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="font-medium">
                  <button
                    type="button"
                    className="flex min-h-8 w-full cursor-pointer items-center gap-1 px-2.5 text-left hover:text-ink"
                    onClick={() => setSort({ col: i, dir: sort?.col === i && sort.dir === 1 ? -1 : 1 })}
                  >
                    {c}
                    <span aria-hidden>{sort?.col === i ? (sort.dir === 1 ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((r, i) => (
              <tr key={i} className="align-top">
                {r.map((cell, j) => (
                  <td key={j} className="max-w-64 break-words px-2.5 py-1.5 tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-2.5 py-1.5 text-[11px] text-muted">
        {rows.length < total ? `${rows.length} dari ${total} baris` : `${total} baris`}
      </p>
    </div>
  );
}

// Horizontal bars: category labels stay readable in a 380px panel.
function BarChart({ c }: { c: Chart }) {
  const max = Math.max(...c.points.map((p) => p.y), 0);
  const top = c.points.reduce((a, b) => (b.y > a.y ? b : a), c.points[0]);
  return (
    <div role="img" aria-label={`Grafik batang ${c.title}: ${c.points.length} kategori, tertinggi ${top.x} dengan ${fmt(top.y)}.`} className="space-y-1.5 p-3">
      <p className="text-[11px] text-muted" aria-hidden>
        {c.y} per {c.x}
      </p>
      {c.points.map((p) => (
        <div key={p.x} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs" title={`${p.x}: ${fmt(p.y)}`}>
          <span className="truncate text-muted">{p.x}</span>
          <span className="h-3 rounded-sm bg-accent" style={{ width: `${max > 0 ? Math.max((p.y / max) * 100, 1) : 0}%` }} />
          <span className="tabular-nums">{fmt(p.y)}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ c }: { c: Chart }) {
  const W = 340;
  const H = 160;
  const P = { l: 40, r: 10, t: 10, b: 24 };
  const ys = c.points.map((p) => p.y);
  const lo = Math.min(...ys, 0);
  const hi = Math.max(...ys);
  const span = hi - lo || 1;
  const x = (i: number) => P.l + (c.points.length > 1 ? (i / (c.points.length - 1)) * (W - P.l - P.r) : (W - P.l - P.r) / 2);
  const y = (v: number) => P.t + (1 - (v - lo) / span) * (H - P.t - P.b);
  const first = c.points[0];
  const last = c.points.at(-1)!;
  const ticks = [...new Set([0, Math.floor((c.points.length - 1) / 2), c.points.length - 1])];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Grafik garis ${c.title}: ${c.points.length} titik, dari ${fmt(first.y)} (${first.x}) ke ${fmt(last.y)} (${last.x}).`}
      className="w-full p-2"
    >
      {[lo, hi].map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#ffffff1a" />
          <text x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#a1a1aa">
            {fmt(v)}
          </text>
        </g>
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#a1a1aa">
          {c.points[i].x}
        </text>
      ))}
      <polyline points={c.points.map((p, i) => `${x(i)},${y(p.y)}`).join(" ")} fill="none" stroke="#00c758" strokeWidth={2} />
      {c.points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.y)} r={3} fill="#00c758">
          <title>{`${p.x}: ${fmt(p.y)}`}</title>
        </circle>
      ))}
    </svg>
  );
}
