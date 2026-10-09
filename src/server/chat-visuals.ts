import neo4j, { type Record as NeoRecord, type Relationship } from "neo4j-driver";
import { dataset } from "./dataset";
import type { GraphEdge, GraphNode, NodeKind } from "./discovery";

// Visuals are built here from the rows a query actually returned; the model only says which query and how to draw it.
export type Visual =
  | { kind: "graph"; title: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { kind: "table"; title: string; columns: string[]; rows: string[][]; total: number }
  | { kind: "bar" | "line"; title: string; x: string; y: string; points: { x: string; y: number }[] };

export type VisualSpec = { kind: Visual["kind"]; title: string; x?: string; y?: string };

export type Cite = { id: string; kind: NodeKind; label: string; file: string; row: number; fields: Record<string, string> };

const KIND: Record<string, NodeKind> = {
  Akun: "account",
  Kontak: "person",
  Deal: "deal",
  Karyawan: "employee",
  Interaksi: "interaction",
  Keputusan: "decision",
  Fitur: "feature",
};
const MAX_NODES = 60;

const num = (v: unknown): number | null => (neo4j.isInt(v) ? (v as { toNumber(): number }).toNumber() : typeof v === "number" ? v : null);

// One table cell: graph entities show their name or id, lists are joined, maps become JSON.
function cell(v: unknown): string {
  if (v == null) return "";
  if (neo4j.isNode(v)) return String(v.properties.nama ?? v.properties.id ?? v.labels[0]);
  if (neo4j.isRelationship(v)) return v.type;
  if (neo4j.isPath(v)) return [...v.segments.map((s) => cell(s.start)), cell(v.end)].join(" → ");
  const n = num(v);
  if (n !== null) return String(n);
  if (Array.isArray(v)) return v.map(cell).join(", ");
  if (typeof v === "object") return JSON.stringify(v, (_k, x) => num(x) ?? x);
  return String(v);
}

function graphOf(records: NeoRecord[], title: string): Visual | string {
  const nodes = new Map<string, GraphNode>(); // by element id
  const rels: Relationship[] = [];
  const walk = (v: unknown): void => {
    if (neo4j.isNode(v)) {
      const p = v.properties as Record<string, unknown>;
      if (!nodes.has(v.elementId) && nodes.size < MAX_NODES)
        nodes.set(v.elementId, {
          id: String(p.id ?? v.elementId),
          label: String(p.nama ?? p.subjek ?? p.judul ?? p.id ?? v.labels[0]),
          kind: KIND[v.labels[0]] ?? "other",
        });
    } else if (neo4j.isRelationship(v)) rels.push(v);
    else if (neo4j.isPath(v)) v.segments.forEach((s) => [s.start, s.relationship, s.end].forEach(walk));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) Object.values(v).forEach(walk);
  };
  records.forEach((r) => r.forEach((v) => walk(v)));
  if (!nodes.size) return "the result holds no nodes. Return nodes, relationships or paths, not only properties";

  const edges: GraphEdge[] = [];
  for (const r of rels) {
    const from = nodes.get(r.startNodeElementId);
    const to = nodes.get(r.endNodeElementId);
    if (!from || !to || edges.some((e) => e.from === from.id && e.to === to.id && e.type === r.type)) continue;
    edges.push({ from: from.id, to: to.id, type: r.type, origin: "record", evidence: [] });
  }
  const unique = [...new Map([...nodes.values()].map((n) => [n.id, n])).values()];
  return { kind: "graph", title, nodes: unique, edges };
}

// Returns the visual, or the reason it cannot be drawn (sent back to the model and shown in the query log).
export function buildVisual(records: NeoRecord[], spec: VisualSpec): Visual | string {
  const title = spec.title.trim().slice(0, 120) || "Hasil query";
  if (!records.length) return "the query returned no rows";
  if (spec.kind === "graph") return graphOf(records, title);

  const columns = records[0].keys.map(String);
  if (spec.kind === "table")
    return { kind: "table", title, columns, rows: records.slice(0, 50).map((r) => columns.map((c) => cell(r.get(c)))), total: records.length };

  const { x, y } = spec;
  if (!x || !y || !columns.includes(x) || !columns.includes(y)) return `x and y must be two of the returned columns: ${columns.join(", ")}`;
  const points = records.map((r) => ({ x: cell(r.get(x)), y: num(r.get(y)) }));
  if (points.some((p) => p.y === null)) return `column ${y} is not numeric. Convert it in Cypher, for example toFloat(...)`;
  return { kind: spec.kind, title, x, y, points: (points as { x: string; y: number }[]).slice(0, spec.kind === "bar" ? 24 : 60) };
}

// ID formats in data/: C01/P01 accounts, K001 contacts, E01 employees, DL-001 deals, D-2025-11 decisions, FEAT-07 features, I0343 interactions.
const ID = /\b(?:D-\d{4}-\d{2}|DL-\d{3}|FEAT-\d{2}|I\d{4}|K\d{3}|E\d{2}|[CP]\d{2})\b/g;
const SOURCES = [
  ["accounts", "account_id", "crm_accounts.csv", "account", "nama"],
  ["contacts", "contact_id", "crm_contacts.csv", "person", "nama"],
  ["employees", "employee_id", "employees.csv", "employee", "nama"],
  ["deals", "deal_id", "crm_deals.csv", "deal", "deal_id"],
  ["decisions", "decision_id", "decision_log.csv", "decision", "decision_id"],
  ["features", "feature_id", "features.csv", "feature", "nama"],
  ["interactions", "interaction_id", "interactions.jsonl", "interaction", "subjek"],
] as const;

// Only IDs that exist in the dataset become citations, so a look-alike string in prose stays plain text.
export function citesIn(text: string): Cite[] {
  const d = dataset();
  const out: Cite[] = [];
  for (const id of new Set(text.match(ID) ?? [])) {
    for (const [key, column, file, kind, labelColumn] of SOURCES) {
      const row = d[key].find((r) => r[column] === id);
      if (!row) continue;
      const { _row, ...fields } = row;
      out.push({
        id,
        kind,
        label: String(row[labelColumn] || id),
        file,
        row: Number(_row),
        fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? "").slice(0, 500)])),
      });
      break;
    }
  }
  return out;
}
