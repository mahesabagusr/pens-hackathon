// Chat visuals and citations (PRD_DASHBOARD.md §13 US4–US6) against the real graph, without calling the chat model.
// Run: npx tsx scripts/check-chat-visuals.mts   (needs `npm run db:up` and a loaded graph)
import "dotenv/config";
import assert from "node:assert/strict";
import { buildVisual, citesIn } from "../src/server/chat-visuals";
import { graph } from "../src/server/graph";

const run = async (q: string) => (await graph().executeQuery(q)).records;

// Table: rows match the query, total counts every row.
const discounts = await run("MATCH (e:Karyawan)-[:MENYETUJUI]->(k:Keputusan {tipe:'diskon'}) RETURN k.id AS id, k.nilai AS nilai, e.nama AS approver LIMIT 100");
const table = buildVisual(discounts, { kind: "table", title: "Diskon disetujui" });
assert.ok(typeof table !== "string" && table.kind === "table");
assert.deepEqual(table.columns, ["id", "nilai", "approver"]);
assert.equal(table.total, discounts.length);
assert.equal(table.rows[0][0], discounts[0].get("id"));

// Bar: numeric y is drawn; a text y is refused with a reason.
const perApprover = await run("MATCH (e:Karyawan)-[:MENYETUJUI]->(k:Keputusan) RETURN e.nama AS approver, count(k) AS n ORDER BY n DESC LIMIT 10");
const bar = buildVisual(perApprover, { kind: "bar", title: "Keputusan per penyetuju", x: "approver", y: "n" });
assert.ok(typeof bar !== "string" && bar.kind === "bar" && bar.points.every((p) => typeof p.y === "number"));
assert.match(String(buildVisual(perApprover, { kind: "bar", title: "x", x: "n", y: "approver" })), /not numeric/);
assert.match(String(buildVisual(perApprover, { kind: "line", title: "x", x: "nope", y: "n" })), /returned columns/);

// Graph: nodes keep natural ids and kinds, edges connect nodes that are in the visual.
const paths = await run("MATCH p=(:Kontak)-[:BEKERJA_DI]->(a:Akun {id:'P01'}) RETURN p LIMIT 20");
const g = buildVisual(paths, { kind: "graph", title: "Kontak di P01" });
assert.ok(typeof g !== "string" && g.kind === "graph");
assert.ok(g.nodes.some((n) => n.id === "P01" && n.kind === "account"));
assert.ok(g.edges.length > 0 && g.edges.every((e) => g.nodes.some((n) => n.id === e.from) && g.nodes.some((n) => n.id === e.to)));
assert.match(String(buildVisual(discounts, { kind: "graph", title: "x" })), /no nodes/);

// Citations: real IDs resolve to file and row, look-alikes stay plain text.
const cites = citesIn("Rina (K017?) ada di P01; lihat I0343, D-2025-11, DL-001, FEAT-07, E01. Bukan P99 atau I9999.");
const ids = cites.map((c) => c.id);
for (const id of ["P01", "I0343", "D-2025-11", "DL-001", "FEAT-07", "E01"]) assert.ok(ids.includes(id), id);
assert.ok(!ids.includes("P99") && !ids.includes("I9999"));
assert.deepEqual(
  cites.find((c) => c.id === "I0343") && { file: cites.find((c) => c.id === "I0343")!.file, row: cites.find((c) => c.id === "I0343")!.row },
  { file: "interactions.jsonl", row: 343 },
);

await graph().close();
console.log("chat visuals: table, bar, graph, cites pass");
