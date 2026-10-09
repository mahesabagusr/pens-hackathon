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
import type { Label, NeighborGroup } from "~/server/neighbors";
import { useChat } from "./chat-provider";
import { EXPLORE_LIMIT, GraphNeighbors, type NeighborState } from "./graph-neighbors";
import { Icon } from "./icon";

const ORIGIN: Record<Origin, string> = {
  record: "Record",
  join: "Gabungan record",
  text_claim: "Klaim teks",
  cross_source_match: "Cocok lintas sumber",
  graph: "Graf (tanpa sitasi)",
};
// Line style carries the origin so it does not depend on colour alone.
const STROKE: Record<Origin, { dash?: string; color: string }> = {
  record: { color: "#a1a1aa" },
  join: { color: "#a1a1aa", dash: "2 4" },
  text_claim: { color: "#ffffff", dash: "8 5" },
  cross_source_match: { color: "#00c758", dash: "3 3" },
  graph: { color: "#8b8b94", dash: "0 5" }, // round dots, see EvidenceEdge
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
// Neo4j label to expand a discovery node with; explored nodes carry their own `type`.
const LABEL_OF: Partial<Record<NodeKind, Label>> = {
  account: "Akun",
  person: "Kontak",
  deal: "Deal",
  employee: "Karyawan",
  interaction: "Interaksi",
  decision: "Keputusan",
  feature: "Fitur",
};
// Explored edges that restate a discovery edge are dropped. Discovery names two relationships differently.
const SAME_AS: Record<string, string> = { MEMILIKI_DEAL: "MEMILIKI", MELIBATKAN: "TERLIBAT_DI" };
const pairKey = (e: GraphEdge) => `${[e.from, e.to].sort().join("|")}|${SAME_AS[e.type] ?? e.type}`;

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

type NodeData = { label: string; kind: NodeKind; focus?: boolean; lit?: boolean; dim?: boolean; type?: string; explored?: boolean };
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
      className={`w-[200px] rounded-md border px-3 py-1.5 transition-[opacity,border-color] duration-150 ${data.dim ? "opacity-25" : ""} ${
        data.explored ? "animate-[fade-in_150ms_ease-out] border-dashed bg-background motion-reduce:animate-none" : "bg-panel"
      } ${selected ? "border-white ring-2 ring-white/30" : data.focus ? "border-accent" : data.lit ? "border-white/70" : data.explored ? "border-white/35" : "border-line"}`}
    >
      <Handle type="target" position={Position.Left} id="l" isConnectable={false} className={handle} />
      <Handle type="source" position={Position.Left} id="ls" isConnectable={false} className={handle} />
      <Handle type="source" position={Position.Right} id="r" isConnectable={false} className={handle} />
      <Handle type="target" position={Position.Right} id="rt" isConnectable={false} className={handle} />
      <p className="truncate text-[13px] leading-5 text-ink">{data.label}</p>
      <p className="text-[11px] leading-4 text-muted">
        {data.explored ? (
          <>
            <span className="font-mono">graf</span> · {data.type}
          </>
        ) : (
          KIND[data.kind]
        )}
      </p>
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
          strokeLinecap: data.origin === "graph" ? "round" : undefined,
          strokeWidth: on ? 2.5 : data.origin === "graph" ? 2 : 1.25,
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
  asOf?: string; // "Tanggal acuan", so explored neighbors match the discovery date
  className?: string;
};

export function EvidenceGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}

function Graph({ nodes: baseNodes, edges: baseEdges, evidence, focusEvidence, focus = [], compact = false, account, asOf, className }: Props) {
  const chat = useChat();
  const flow = useReactFlow();
  const [rf, setRf] = useState(() => layout(baseNodes, focus));
  const [selEdges, setSelEdges] = useState<Set<string>>(new Set());
  const [hiddenOrigins, setHiddenOrigins] = useState<Set<Origin>>(new Set());
  const [hiddenKinds, setHiddenKinds] = useState<Set<NodeKind>>(new Set());
  const [mainOnly, setMainOnly] = useState(false);
  const [view, setView] = useState<"graph" | "list">("graph");
  // Exploring: fetched neighbor groups per node (kept as a cache), and the groups put on the canvas, keyed `${source}|${group.key}`.
  const [found, setFound] = useState<Map<string, NeighborState>>(new Map());
  const [added, setAdded] = useState<Map<string, { source: string; group: NeighborGroup }>>(new Map());
  const [announce, setAnnounce] = useState("");

  // The canvas is the discovery graph plus explored groups. Explored edges that restate an edge already drawn are dropped,
  // and an explored node stays only while some explored edge still reaches it.
  const { nodes, edges, exploredCount } = useMemo(() => {
    const ids = new Set(baseNodes.map((n) => n.id));
    const pairs = new Set(baseEdges.map(pairKey));
    const extraEdges: GraphEdge[] = [];
    for (const { group } of added.values())
      for (const e of group.edges) {
        if (pairs.has(pairKey(e))) continue;
        pairs.add(pairKey(e));
        extraEdges.push(e);
      }
    const known = new Map<string, GraphNode>();
    for (const st of found.values()) if (typeof st === "object" && "groups" in st) for (const g of st.groups) for (const n of g.nodes) known.set(n.id, n);
    const extraNodes = new Map<string, GraphNode>();
    for (const e of extraEdges) for (const id of [e.from, e.to]) if (!ids.has(id) && known.has(id)) extraNodes.set(id, known.get(id)!);
    const drawn = (id: string) => ids.has(id) || extraNodes.has(id);
    return {
      nodes: [...baseNodes, ...extraNodes.values()],
      edges: [...baseEdges, ...extraEdges.filter((e) => drawn(e.from) && drawn(e.to))],
      exploredCount: extraNodes.size,
    };
  }, [baseNodes, baseEdges, added, found]);

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
  const selNodes = rf.filter((n) => n.selected && byId.has(n.id) && shown(byId.get(n.id)!)).map((n) => n.id);
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
  const one = onlyNode ? byId.get(onlyNode)! : null;
  const oneEdge = selEdgeList.length === 1 && !selNodes.length ? selEdgeList[0] : null;
  const fromOf = (id: string) => {
    const src = [...added.values()].find((a) => a.group.nodes.some((n) => n.id === id))?.source;
    return src ? byId.get(src)?.label : undefined;
  };
  const setSelectedNode = chat?.setSelectedNode;
  useEffect(() => {
    if (!compact) setSelectedNode?.(onlyNode);
  }, [compact, onlyNode, setSelectedNode]);

  const xOf = new Map(rf.map((n) => [n.id, n.position.x]));
  // rf keeps positions of explored nodes that were removed again; only nodes still on the canvas are drawn.
  const flowNodes: EvNode[] = rf
    .filter((n) => byId.has(n.id))
    .map((n) => ({
      ...n,
      hidden: !shown(byId.get(n.id)!),
      ariaLabel: n.data.explored
        ? `${n.data.label}, ${n.data.type}, dari graf, tanpa sitasi`
        : `${n.data.label}, ${KIND[n.data.kind]}. Tampilkan bukti yang terhubung.`,
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
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fit = () => flow.fitView({ padding: 0.15, duration: reduced() ? 0 : 200 });
  // Resets the discovery layout only; explored nodes keep where they were put.
  const reset = () => {
    setRf((prev) => [...layout(baseNodes, []), ...prev.filter((n) => n.data.explored)]);
    setSelEdges(new Set());
    requestAnimationFrame(fit);
  };

  const labelOf = (n: GraphNode) => (n.type as Label | undefined) ?? LABEL_OF[n.kind];
  const load = async (n: GraphNode) => {
    const label = labelOf(n);
    const st = found.get(n.id);
    if (!label || st === "loading" || (typeof st === "object" && "groups" in st)) return;
    setFound((m) => new Map(m).set(n.id, "loading"));
    let next: NeighborState;
    try {
      const res = await fetch(`/api/graph/neighbors?${new URLSearchParams({ id: n.id, label, ...(asOf ? { asof: asOf } : {}) })}`);
      next = res.ok ? await res.json() : { error: res.status === 401 ? "auth" : res.status === 404 ? "missing" : res.status === 503 ? "down" : "failed" };
    } catch {
      next = { error: "down" };
    }
    setFound((m) => new Map(m).set(n.id, next));
    if (typeof next === "object" && "groups" in next) setAnnounce(`${next.groups.length} kelompok tetangga untuk ${n.label}.`);
  };
  // What a group would add right now: edges not already drawn, and nodes not already on the canvas.
  const drawnPairs = new Set(edges.map(pairKey));
  const fresh = (g: NeighborGroup) => ({
    edges: g.edges.filter((e) => !drawnPairs.has(pairKey(e))).length,
    nodes: g.nodes.filter((n) => !byId.has(n.id)).length,
  });
  const addGroups = (source: string, groups: NeighborGroup[]) => {
    const newNodes = [...new Map(groups.flatMap((g) => g.nodes).filter((n) => !byId.has(n.id)).map((n) => [n.id, n])).values()];
    if (exploredCount + newNodes.length > EXPLORE_LIMIT) return;
    setAdded((prev) => {
      const next = new Map(prev);
      for (const g of groups) next.set(`${source}|${g.key}`, { source, group: g });
      return next;
    });
    // New nodes go in a column (8 per column) right of everything drawn, centred on the node they came from.
    const drawn = rf.filter((n) => byId.has(n.id));
    const x0 = Math.max(...drawn.map((n) => n.position.x)) + 280;
    const y0 = drawn.find((n) => n.id === source)?.position.y ?? 0;
    const rows = Math.min(newNodes.length, 8);
    const placed: EvNode[] = newNodes.map((n, i) => ({
      id: n.id,
      type: "evidence",
      position: { x: x0 + Math.floor(i / 8) * 230, y: y0 + ((i % 8) - (rows - 1) / 2) * 60 },
      data: { label: n.label, kind: n.kind, type: n.type, explored: true },
    }));
    const ids = new Set(placed.map((n) => n.id));
    setRf((prev) => [...prev.filter((n) => !ids.has(n.id)), ...placed]);
    const counts = groups.map((g) => `${fresh(g).nodes} ${g.label}`).join(", ");
    setAnnounce(`${newNodes.length} node ditambahkan dari graf: ${counts}.`);
    const around = [source, ...ids, ...groups.flatMap((g) => g.edges.flatMap((e) => [e.from, e.to]))];
    // Wait a frame so React Flow has measured the new nodes before fitting to them.
    setTimeout(() => flow.fitView({ nodes: [...new Set(around)].map((id) => ({ id })), padding: 0.2, duration: reduced() ? 0 : 300 }), 50);
  };
  const removeGroups = (keys: string[], what: string) => {
    if (!keys.length) return;
    setAdded((prev) => {
      const next = new Map(prev);
      for (const k of keys) next.delete(k);
      return next;
    });
    setAnnounce(`${what} dihapus dari graf.`);
  };
  const keysFrom = (source: string) => [...added.entries()].filter(([, a]) => a.source === source).map(([k]) => k);
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
        else if (e.key === "e" && onlyNode) load(byId.get(onlyNode)!);
        else if (e.key === "E" && onlyNode) removeGroups(keysFrom(onlyNode), `Eksplorasi dari ${byId.get(onlyNode)!.label}`);
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
        {!compact && <MiniMap pannable zoomable position="bottom-right" nodeColor={(n) => ((n.data as NodeData).focus ? "#00c758" : (n.data as NodeData).explored ? "#26262b" : "#3f3f46")} maskColor="#08080acc" />}
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
      <div role="toolbar" aria-label="Kontrol graph" className="evidence-toolbar flex flex-wrap items-center border-b border-line">
        <div className="evidence-toolbar-section">
          <h3 className="evidence-toolbar-label">Entity</h3>
          <div className="evidence-toolbar-controls">
        {origins.map((o) => (
          <button key={o} type="button" aria-pressed={!hiddenOrigins.has(o)} onClick={() => setHiddenOrigins(toggle(hiddenOrigins, o))} className={chip(!hiddenOrigins.has(o))}>
            <svg width="18" height="6" aria-hidden>
              <line x1="1" y1="3" x2="17" y2="3" stroke={STROKE[o].color} strokeDasharray={STROKE[o].dash} strokeLinecap={o === "graph" ? "round" : undefined} strokeWidth={2} />
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
            <div className="evidence-reset-group">
              <button type="button" onClick={reset} className={chip(false)}>
                <Icon name="reset" className="size-3.5" /> Atur ulang
              </button>
            </div>
          </div>
        </div>
        <div className="evidence-toolbar-section">
          <h3 className="evidence-toolbar-label">Tampilan</h3>
          <div className="evidence-toolbar-actions">

          <div role="group" aria-label="Tampilan" className="flex">
            <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")} className={chip(view === "graph")}>
              <Icon name="graph" className="size-3.5" /> Graph
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={chip(view === "list")}>
              <Icon name="list" className="size-3.5" /> Daftar
            </button>
          </div>
          {exploredCount > 0 && (
            <button type="button" onClick={() => removeGroups([...added.keys()], "Semua eksplorasi")} className={chip(false)}>
              <Icon name="trash" className="size-3.5" /> Hapus eksplorasi ({exploredCount})
            </button>
          )}
            <label className="evidence-main-toggle">
              <input type="checkbox" role="switch" checked={mainOnly} disabled={!focusEvidence.length} onChange={() => setMainOnly(!mainOnly)} />
              <span className="evidence-toggle-track" aria-hidden="true"><span /></span>
              <span>Jalur utama saja</span>
            </label>

          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {view === "graph" ? (
          canvas
        ) : (
          <div className="relative max-h-[min(68dvh,44rem)] min-w-0 flex-1 overflow-auto">
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
            <p className="sr-only" aria-live="polite">
              {announce}
            </p>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            {one?.explored && (
              <div className="border-b border-line p-3">
                <p className="text-xs text-muted">
                  <span className="font-mono">graf</span> · {one.type}
                  {fromOf(one.id) && <> · ditambahkan dari {fromOf(one.id)}</>}
                </p>
                <Fields props={one.props} />
                <p className="mt-2 break-all font-mono text-[11px] text-muted">
                  {one.cite ? `Sumber: ${one.cite.file}:${one.cite.row}` : "Tidak ada baris sumber di data/"}
                </p>
                {chat && (
                  <button
                    type="button"
                    onClick={() => chat.ask(`Jelaskan ${one.type} ${one.label} (${one.id}) dan hubungannya dengan ${account ?? "akun ini"}.`)}
                    className="evidence-ask-button mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 px-2.5 text-xs pointer-coarse:min-h-11"
                  >
                    <Icon name="chat" className="size-3.5" /> Tanya AI
                  </button>
                )}
              </div>
            )}
            {oneEdge?.origin === "graph" && (
              <div className="border-b border-line p-3">
                <p className="font-mono text-xs">
                  {oneEdge.type}
                  {oneEdge.count ? ` · ${oneEdge.count} catatan` : ""}
                </p>
                <Fields props={oneEdge.props} />
                <p className="mt-2 text-[11px] text-muted">Hubungan ini diturunkan oleh loader graf, bukan kutipan dari satu baris data.</p>
              </div>
            )}
            {one && labelOf(one) && (
              <GraphNeighbors
                name={one.label}
                state={found.get(one.id)}
                added={new Set(keysFrom(one.id).map((k) => k.slice(one.id.length + 1)))}
                fresh={fresh}
                room={EXPLORE_LIMIT - exploredCount}
                onLoad={() => load(one)}
                onAdd={(groups) => addGroups(one.id, groups)}
                onRemove={(key) => {
                  const g = added.get(`${one.id}|${key}`)?.group;
                  removeGroups([`${one.id}|${key}`], g ? `${g.label} lewat ${g.type}` : "Kelompok");
                }}
                onAsk={chat?.ask}
              />
            )}
            {picking && !active.size ? (
              <p className="p-3 text-xs text-muted">Tidak ada bukti bertanda sumber untuk pilihan ini.</p>
            ) : (
              <ol className="space-y-2 p-3">
                {[...evidence]
                  .sort((a, b) => Number(active.has(b.id)) - Number(active.has(a.id)))
                  .map((e) => (
                    <li key={e.id} className={`evidence-source-card rounded-md border p-2.5 text-sm ${active.has(e.id) ? "is-active" : "border-line opacity-60"}`}>
                      <p className="evidence-source-title">{e.label}</p>
                      <div className="evidence-source-actions">
                      <button type="button" className="evidence-source-label mt-1.5" title={`1 sumber: ${e.file}:${e.row} · ${e.column}${e.date ? ` · ${e.date}` : ""}`} aria-label="1 source">
                        Source <span>1</span><Icon name="chevron-right" className="size-3.5" />
                      </button>
                      {active.has(e.id) && chat && (
                        <button
                          type="button"
                          onClick={() => chat.ask(`Jelaskan bukti "${e.label}" (${e.file} baris ${e.row}) untuk ${account ?? "akun ini"}: apa isinya dan apa artinya bagi keputusan pembelian?`)}
                          className="evidence-ask-button mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 px-2.5 text-xs pointer-coarse:min-h-11"
                        >
                          <Icon name="chat" className="size-3.5" /> Tanya AI
                        </button>
                      )}
                      </div>
                      <p className="evidence-source-origin">{ORIGIN[e.origin]}</p>
                      {e.excerpt && <blockquote className="evidence-source-excerpt line-clamp-4 text-xs text-muted">{e.excerpt}</blockquote>}

                    </li>
                  ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Fields({ props }: { props?: Record<string, string> }) {
  const rows = Object.entries(props ?? {});
  if (!rows.length) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-mono text-[11px] text-muted">{k}</dt>
          <dd className="line-clamp-3 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
