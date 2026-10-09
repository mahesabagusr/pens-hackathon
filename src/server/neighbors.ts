import neo4j from "neo4j-driver";
import { citesIn, LABEL_KIND } from "./chat-visuals";
import type { GraphEdge, GraphNode } from "./discovery";
import { graph } from "./graph";

// One-hop neighbors of a Jalur bukti node, read from Neo4j (PRD_GRAPH_EXPLORE.md §8–9).
// Neo4j holds every relationship the loader built, so this shows context discovery.ts never draws.
// Nothing here is evidence: edges come back with origin "graph" and no file:row.

export const LABELS = [
  "Akun", "Kontak", "Karyawan", "Outlet", "Deal", "Kontrak", "Interaksi",
  "Tiket", "Bug", "Rilis", "Fitur", "Keputusan", "Kompetitor", "Organisasi",
] as const;
export type Label = (typeof LABELS)[number];

export const PER_GROUP = 12;

export type NeighborGroup = {
  key: string; // `${type}|${label}|${direction}`
  type: string;
  label: Label;
  direction: "out" | "in" | "both"; // relative to the expanded node; "both" for SALING_KENAL, stored one way only
  total: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
export type NeighborResult = { id: string; label: Label; asOf: string; groups: NeighborGroup[]; hidden: number };

type Props = Record<string, unknown>;

// The loader stores this one way (lower id first); it means the same thing in both directions.
const SYMMETRIC = new Set(["SALING_KENAL"]);
// Loader-internal fields that mean nothing to a reader.
const SKIP = new Set(["id", "lokal", "dari_lokal", "ke_lokal"]);

const text = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v));
// Display fields; values that only repeat the node's id or name (contact_id, ticket_id, nama) are left out.
const fields = (p: Props) =>
  Object.fromEntries(
    Object.entries(p)
      .filter(([k, v]) => !SKIP.has(k) && v != null && v !== "" && v !== p.id && v !== p.nama)
      .slice(0, 8)
      .map(([k, v]) => [k, text(v).slice(0, 200)]),
  );

// The date a neighbor became true, if it has one: a job's start, or the neighbor's own date.
// All dates are YYYY-MM-DD strings (scripts/load-neo4j.mts), so string order is date order.
const dateOf = (rel: Props, node: Props) => (rel.mulai ?? node.tanggal ?? node.dibuat ?? node.mulai ?? node.tanggal_rilis) as string | undefined;

// PRD §8: keep what existed on asOf. Undated neighbors (people, outlets, SALING_KENAL, CHAMPION_DARI) are always kept.
export function existedOn(rel: Props, node: Props, asOf: string) {
  const d = dateOf(rel, node);
  if (d && d > asOf) return false;
  return !(typeof rel.bulan === "string" && rel.bulan.slice(0, 7) > asOf.slice(0, 7));
}

// Returns null when no node has that label and id.
export async function neighbors({ id, label, asOf }: { id: string; label: Label; asOf: string }): Promise<NeighborResult | null> {
  const session = graph().session({ defaultAccessMode: neo4j.session.READ });
  let records;
  try {
    // `label` is one of LABELS (checked by the caller's zod enum), so interpolating it is safe; id stays a parameter.
    ({ records } = await session.run(
      `MATCH (n:\`${label}\` {id: $id})
       OPTIONAL MATCH (n)-[r]-(m)
       RETURN type(r) AS type, labels(m)[0] AS label, startNode(r) = n AS out, properties(r) AS rel, properties(m) AS node`,
      { id },
    ));
  } finally {
    await session.close();
  }
  if (!records.length) return null;

  let hidden = 0;
  type Item = { rel: Props; node: Props; out: boolean; count: number };
  const groups = new Map<string, { type: string; label: Label; direction: NeighborGroup["direction"]; items: Map<string, Item> }>();
  for (const r of records) {
    const type = r.get("type") as string | null;
    if (!type) continue; // the node exists but has no relationships
    const rel = r.get("rel") as Props;
    const node = r.get("node") as Props;
    if (!existedOn(rel, node, asOf)) {
      hidden++;
      continue;
    }
    const out = r.get("out") as boolean;
    const neighborLabel = r.get("label") as Label;
    const direction = SYMMETRIC.has(type) ? "both" : out ? "out" : "in";
    const key = `${type}|${neighborLabel}|${direction}`;
    const g = groups.get(key) ?? { type, label: neighborLabel, direction, items: new Map() };
    groups.set(key, g);
    // Parallel relationships to the same neighbor (MEMAKAI once per month) become one edge with a count; keep the latest.
    const nid = String(node.id);
    const prev = g.items.get(nid);
    if (!prev) g.items.set(nid, { rel, node, out, count: 1 });
    else {
      prev.count++;
      if (String(rel.bulan ?? "") > String(prev.rel.bulan ?? "")) prev.rel = rel;
    }
  }

  const result = [...groups.entries()].map(([key, g]): NeighborGroup => {
    const items = [...g.items.values()].sort(
      (a, b) => (dateOf(b.rel, b.node) ?? "").localeCompare(dateOf(a.rel, a.node) ?? "") || String(a.node.id).localeCompare(String(b.node.id)),
    );
    const shown = items.slice(0, PER_GROUP);
    return {
      key,
      type: g.type,
      label: g.label,
      direction: g.direction,
      total: items.length,
      nodes: shown.map(({ node }) => {
        const nid = String(node.id);
        const cite = citesIn(nid).find((c) => c.id === nid);
        return {
          id: nid,
          label: String(node.nama ?? node.subjek ?? node.judul ?? nid),
          kind: LABEL_KIND[g.label] ?? "other",
          type: g.label,
          explored: true,
          props: fields(node),
          ...(cite && { cite: { file: cite.file, row: cite.row } }),
        };
      }),
      edges: shown.map(({ rel, node, out, count }) => ({
        from: out ? id : String(node.id),
        to: out ? String(node.id) : id,
        type: g.type,
        origin: "graph",
        evidence: [],
        props: fields(rel),
        ...(count > 1 && { count }),
      })),
    };
  });
  result.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  return { id, label, asOf, groups: result, hidden };
}
