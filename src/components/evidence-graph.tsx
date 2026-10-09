"use client";

import {
  applyNodeChanges,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import type { Evidence, GraphEdge, GraphNode, NodeKind, Origin } from "~/server/discovery";
import { useChat } from "./chat-provider";
import { Icon } from "./icon";

const ORIGIN: Record<Origin, string> = {
  record: "Record",
  join: "Gabungan record",
  text_claim: "Klaim teks",
  cross_source_match: "Cocok lintas sumber",
};
// Line style carries the origin so it does not depend on colour alone.
const STROKE: Record<Origin, { dash?: string; color: string }> = {
  record: { color: "#a1a1aa" },
  join: { color: "#a1a1aa", dash: "2 4" },
  text_claim: { color: "#ffffff", dash: "8 5" },
  cross_source_match: { color: "#00c758", dash: "3 3" },
};
const KIND: Record<NodeKind, string> = {
  account: "Akun",
  person: "Kontak",
  deal: "Deal",
  employee: "Karyawan",
  interaction: "Interaksi",
  decision: "Keputusan",
  feature: "Fitur",
  other: "Lainnya",
};
// Columns read left to right: what was said, who, the account, and what it connects to elsewhere.
const COLUMN: Record<NodeKind, number> = { interaction: 0, person: 1, account: 2, deal: 2, employee: 2, decision: 3, feature: 3, other: 3 };
const COL_X = [0, 280, 560, 840];
const ROW_H = 76;

const ARIA: ComponentProps<typeof ReactFlow>["ariaLabelConfig"] = {
  "node.a11yDescription.default": "Tekan Enter atau Spasi untuk memilih. Escape membatalkan pilihan. Panah memindahkan node yang terpilih.",
  "node.a11yDescription.keyboardDisabled": "Tekan Enter atau Spasi untuk memilih. Escape membatalkan pilihan.",
  "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) => `Node dipindah ke ${direction}. Posisi x ${x}, y ${y}.`,
  "edge.a11yDescription.default": "Tekan Enter atau Spasi untuk memilih relasi. Escape membatalkan pilihan.",
  "controls.ariaLabel": "Kontrol tampilan",
  "controls.zoomIn.ariaLabel": "Perbesar",
  "controls.zoomOut.ariaLabel": "Perkecil",
  "controls.fitView.ariaLabel": "Tampilkan semua node",
  "controls.interactive.ariaLabel": "Kunci interaksi",
  "minimap.ariaLabel": "Peta mini",
  "handle.ariaLabel": "Titik sambung",
};

type NodeData = { label: string; kind: NodeKind; focus?: boolean; lit?: boolean; dim?: boolean };
type EvNode = Node<NodeData, "evidence">;
type EdgeData = { origin: Origin; type: string; lit: boolean; dim: boolean };
type EvEdge = Edge<EdgeData, "evidence">;

const edgeId = (e: GraphEdge) => `${e.from}>${e.to}>${e.type}`;

function layout(nodes: GraphNode[], selected: string[]): EvNode[] {
  const counts = [0, 0, 0, 0];
  return nodes.map((n) => {
    // Accounts the person used to work at sit with the precedents, not on top of the focus account.
    const col = n.kind === "account" && !n.focus ? 3 : COLUMN[n.kind];
    return {
      id: n.id,
      type: "evidence",
      position: { x: COL_X[col], y: counts[col]++ * ROW_H },
      data: { label: n.label, kind: n.kind, focus: n.focus },
      selected: selected.includes(n.id),
    };
  });
}

// Hidden handles on both sides, so an edge can leave and enter on whichever side faces the other node.
const handle = "pointer-events-none! size-1! min-h-0! min-w-0! border-0! bg-transparent!";
function EvidenceNode({ data, selected }: NodeProps<EvNode>) {
  return (
    <div
      title={data.label}
      className={`w-[200px] rounded-md border bg-panel px-3 py-1.5 transition-[opacity,border-color] duration-150 ${data.dim ? "opacity-25" : ""} ${
        selected ? "border-white ring-2 ring-white/30" : data.focus ? "border-accent" : data.lit ? "border-white/70" : "border-line"
      }`}
    >
      <Handle type="target" position={Position.Left} id="l" isConnectable={false} className={handle} />
      <Handle type="source" position={Position.Left} id="ls" isConnectable={false} className={handle} />
      <Handle type="source" position={Position.Right} id="r" isConnectable={false} className={handle} />
      <Handle type="target" position={Position.Right} id="rt" isConnectable={false} className={handle} />
      <p className="truncate text-[13px] leading-5 text-ink">{data.label}</p>
      <p className="text-[11px] leading-4 text-muted">{KIND[data.kind]}</p>
    </div>
  );
}

function EvidenceEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<EvEdge>) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  if (!data) return null;
  const s = STROKE[data.origin];
  const on = selected || data.lit;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={16}
        style={{
          stroke: selected ? "#ffffff" : s.color,
          strokeDasharray: s.dash,
          strokeWidth: on ? 2.5 : 1.25,
          opacity: data.dim ? 0.2 : on ? 1 : 0.55,
          transition: "opacity 150ms",
        }}
      />
      {on && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
            className="nodrag nopan pointer-events-none absolute rounded border border-line bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted"
          >
            {data.type}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const NODE_TYPES = { evidence: EvidenceNode };
const EDGE_TYPES = { evidence: EvidenceEdge };

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  evidence: Evidence[];
  focusEvidence: string[];
  focus?: string[]; // node ids to select first, from ?focus=
  compact?: boolean; // read-only, for chat answers
  account?: string; // account name, for the questions sent to chat
  className?: string;
};

export function EvidenceGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}

function Graph({ nodes, edges, evidence, focusEvidence, focus = [], compact = false, account, className }: Props) {
  const chat = useChat();
  const flow = useReactFlow();
  const [rf, setRf] = useState(() => layout(nodes, focus));
  const [selEdges, setSelEdges] = useState<Set<string>>(new Set());
  const [hiddenOrigins, setHiddenOrigins] = useState<Set<Origin>>(new Set());
  const [hiddenKinds, setHiddenKinds] = useState<Set<NodeKind>>(new Set());
  const [mainOnly, setMainOnly] = useState(false);
  const [view, setView] = useState<"graph" | "list">("graph");

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const focusSet = useMemo(() => new Set(focusEvidence), [focusEvidence]);
  const filtered = hiddenOrigins.size > 0 || hiddenKinds.size > 0 || mainOnly;
  const visibleEdges = edges.filter(
    (e) =>
      !hiddenOrigins.has(e.origin) &&
      !hiddenKinds.has(byId.get(e.from)!.kind) &&
      !hiddenKinds.has(byId.get(e.to)!.kind) &&
      (!mainOnly || e.evidence.some((id) => focusSet.has(id))),
  );
  const linked = new Set(visibleEdges.flatMap((e) => [e.from, e.to]));
  const shown = (n: GraphNode) => !hiddenKinds.has(n.kind) && (!filtered || linked.has(n.id) || !!n.focus);
  const edgeLabel = (e: GraphEdge) => `${e.type}: ${byId.get(e.from)?.label} ke ${byId.get(e.to)?.label} (${ORIGIN[e.origin]})`;

  // What is selected decides which evidence is listed and which elements stay lit.
  const selNodes = rf.filter((n) => n.selected && shown(byId.get(n.id)!)).map((n) => n.id);
  const selEdgeList = visibleEdges.filter((e) => selEdges.has(edgeId(e)));
  const picking = selNodes.length + selEdgeList.length > 0;
  const chosen = picking
    ? [...visibleEdges.filter((e) => selNodes.includes(e.from) || selNodes.includes(e.to)), ...selEdgeList]
    : visibleEdges.filter((e) => e.evidence.some((id) => focusSet.has(id)));
  const litEdges = new Set(chosen.map(edgeId));
  const litNodes = new Set([...selNodes, ...chosen.flatMap((e) => [e.from, e.to])]);
  // With no identified person there is no main path, so start from every source instead of an empty panel.
  const active = new Set(picking ? chosen.flatMap((e) => e.evidence) : focusEvidence.length ? focusEvidence : evidence.map((e) => e.id));
  const title = picking
    ? selNodes.length + selEdgeList.length > 1
      ? `${selNodes.length + selEdgeList.length} elemen terpilih`
      : selNodes[0]
        ? byId.get(selNodes[0])!.label
        : edgeLabel(selEdgeList[0])
    : focusEvidence.length
      ? "Jalur bukti jawaban utama"
      : "Semua sumber untuk akun ini";

  const onlyNode = selNodes.length === 1 && !selEdgeList.length ? selNodes[0] : null;
  const setSelectedNode = chat?.setSelectedNode;
  useEffect(() => {
    if (!compact) setSelectedNode?.(onlyNode);
  }, [compact, onlyNode, setSelectedNode]);

  const xOf = new Map(rf.map((n) => [n.id, n.position.x]));
  const flowNodes: EvNode[] = rf.map((n) => ({
    ...n,
    hidden: !shown(byId.get(n.id)!),
    ariaLabel: `${n.data.label}, ${KIND[n.data.kind]}. Tampilkan bukti yang terhubung.`,
    data: { ...n.data, lit: litNodes.has(n.id), dim: picking && !litNodes.has(n.id) },
  }));
  const visibleIds = new Set(visibleEdges.map(edgeId));
  const flowEdges: EvEdge[] = edges.map((e) => {
    const id = edgeId(e);
    const fx = xOf.get(e.from)!;
    const tx = xOf.get(e.to)!;
    return {
      id,
      source: e.from,
      target: e.to,
      type: "evidence",
      sourceHandle: fx <= tx ? "r" : "ls",
      targetHandle: fx < tx ? "l" : "rt",
      hidden: !visibleIds.has(id),
      selected: selEdges.has(id),
      ariaLabel: edgeLabel(e),
      data: { origin: e.origin, type: e.type, lit: litEdges.has(id), dim: picking && !litEdges.has(id) },
    };
  });

  const onNodesChange = useCallback((changes: NodeChange<EvNode>[]) => setRf((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback(
    (changes: EdgeChange<EvEdge>[]) =>
      setSelEdges((prev) => {
        const next = new Set(prev);
        for (const c of changes) {
          if (c.type !== "select") continue;
          if (c.selected) next.add(c.id);
          else next.delete(c.id);
        }
        return next;
      }),
    [],
  );
  const pickEdge = (e: GraphEdge) => {
    setRf((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
    setSelEdges(new Set([edgeId(e)]));
  };
  const fit = () => flow.fitView({ padding: 0.15, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200 });
  const reset = () => {
    setRf(layout(nodes, []));
    setSelEdges(new Set());
    requestAnimationFrame(fit);
  };
  // Chat graphs can mount inside a hidden drawer (0×0), where the initial fit is useless; refit once they get a size.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!compact || !box.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width) requestAnimationFrame(() => flow.fitView({ padding: 0.15 }));
    });
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [compact, flow]);

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const canvas = (
    <div
      ref={box}
      className={`${compact ? (className ?? "h-64") : "h-[min(68dvh,44rem)] min-h-[22rem]"} min-w-0 flex-1`}
      onKeyDown={(e) => {
        if (compact || (e.target as HTMLElement).closest("input, textarea, button")) return;
        if (e.key === "f") fit();
        else if (e.key === "+" || e.key === "=") flow.zoomIn();
        else if (e.key === "-") flow.zoomOut();
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        colorMode="dark"
        ariaLabelConfig={ARIA}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        nodesDraggable={!compact}
        elementsSelectable={!compact}
        nodesFocusable={!compact}
        edgesFocusable={!compact}
        zoomOnScroll={!compact}
        preventScrolling={!compact}
      >
        <Background gap={24} size={1} color="#ffffff14" />
        <Controls showInteractive={false} position="bottom-left" />
        {!compact && <MiniMap pannable zoomable position="bottom-right" nodeColor={(n) => ((n.data as NodeData).focus ? "#00c758" : "#3f3f46")} maskColor="#08080acc" />}
      </ReactFlow>
    </div>
  );
  if (compact) return canvas;

  const kinds = [...new Set(nodes.map((n) => n.kind))];
  const origins = [...new Set(edges.map((e) => e.origin))];
  const chip = (on: boolean) =>
    `inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors duration-150 pointer-coarse:min-h-11 disabled:cursor-not-allowed disabled:opacity-40 ${
      on ? "border-white/60 bg-white/10 text-ink" : "border-line text-muted hover:border-white/40 hover:text-ink"
    }`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div role="toolbar" aria-label="Kontrol graph" className="flex flex-wrap items-center gap-1.5 border-b border-line p-2">
        <button type="button" aria-pressed={mainOnly} disabled={!focusEvidence.length} onClick={() => setMainOnly(!mainOnly)} className={chip(mainOnly)}>
          Jalur utama saja
        </button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {origins.map((o) => (
          <button key={o} type="button" aria-pressed={!hiddenOrigins.has(o)} onClick={() => setHiddenOrigins(toggle(hiddenOrigins, o))} className={chip(!hiddenOrigins.has(o))}>
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke={STROKE[o].color} strokeDasharray={STROKE[o].dash} strokeWidth={2} />
            </svg>
            {ORIGIN[o]}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {kinds.map((k) => (
          <button key={k} type="button" aria-pressed={!hiddenKinds.has(k)} onClick={() => setHiddenKinds(toggle(hiddenKinds, k))} className={chip(!hiddenKinds.has(k))}>
            {KIND[k]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div role="group" aria-label="Tampilan" className="flex">
            <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")} className={`${chip(view === "graph")} rounded-r-none`}>
              <Icon name="graph" className="size-3.5" /> Graph
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`${chip(view === "list")} -ml-px rounded-l-none`}>
              <Icon name="list" className="size-3.5" /> Daftar
            </button>
          </div>
          <button type="button" onClick={reset} className={chip(false)}>
            <Icon name="reset" className="size-3.5" /> Atur ulang
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {view === "graph" ? (
          canvas
        ) : (
          <div className="max-h-[min(68dvh,44rem)] min-w-0 flex-1 overflow-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Semua relasi yang tampil di graph</caption>
              <thead className="sticky top-0 bg-panel text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-3 py-2 font-medium">Dari</th>
                  <th scope="col" className="px-3 py-2 font-medium">Relasi</th>
                  <th scope="col" className="px-3 py-2 font-medium">Ke</th>
                  <th scope="col" className="px-3 py-2 font-medium">Asal</th>
                  <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Pilih</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleEdges.map((e) => {
                  const on = selEdges.has(edgeId(e));
                  return (
                    <tr key={edgeId(e)} className={litEdges.has(edgeId(e)) ? "" : "text-muted"}>
                      <td className="px-3 py-2">{byId.get(e.from)?.label}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.type}</td>
                      <td className="px-3 py-2">{byId.get(e.to)?.label}</td>
                      <td className="px-3 py-2 text-xs">{ORIGIN[e.origin]}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" aria-pressed={on} aria-label={`Pilih ${edgeLabel(e)}`} onClick={() => (on ? setSelEdges(new Set()) : pickEdge(e))} className={chip(on)}>
                          {on ? "Terpilih" : "Pilih"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <section aria-labelledby="evidence-title" className="flex max-h-[min(68dvh,44rem)] flex-col border-t border-line lg:w-80 lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="border-b border-line p-3">
            <h3 id="evidence-title" className="text-sm font-medium">
              Bukti: {title}
            </h3>
            <p className="mt-0.5 text-xs text-muted" aria-live="polite">
              {active.size} sumber terpilih dari {evidence.length}.{picking ? " Escape untuk kembali ke jalur utama." : ""}
            </p>
          </div>
          <ol className="space-y-2 overflow-y-auto p-3">
            {[...evidence]
              .sort((a, b) => Number(active.has(b.id)) - Number(active.has(a.id)))
              .map((e) => (
                <li key={e.id} className={`rounded-md border p-2.5 text-sm ${active.has(e.id) ? "border-accent/70" : "border-line opacity-60"}`}>
                  <p className="font-medium">{e.label}</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] text-muted">
                    {e.file}:{e.row} · {e.column}
                    {e.date ? ` · ${e.date}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{ORIGIN[e.origin]}</p>
                  {e.excerpt && <blockquote className="mt-1.5 line-clamp-4 border-l border-line pl-2 text-xs text-muted">{e.excerpt}</blockquote>}
                  {active.has(e.id) && chat && (
                    <button
                      type="button"
                      onClick={() => chat.ask(`Jelaskan bukti "${e.label}" (${e.file} baris ${e.row}) untuk ${account ?? "akun ini"}: apa isinya dan apa artinya bagi keputusan pembelian?`)}
                      className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 text-xs text-accent hover:underline pointer-coarse:min-h-11"
                    >
                      <Icon name="chat" className="size-3.5" /> Tanya chat tentang ini
                    </button>
                  )}
                </li>
              ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
