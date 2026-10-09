// Graph exploration (PRD_GRAPH_EXPLORE.md §13) against the loaded Neo4j graph and data/.
// Run: npx tsx scripts/check-graph-neighbors.mts   (needs `npm run db:up` and `npm run graph:load`)
import "dotenv/config";
import assert from "node:assert/strict";
import { citesIn } from "../src/server/chat-visuals";
import { SNAPSHOT } from "../src/server/discovery";
import { graph } from "../src/server/graph";
import { existedOn, neighbors, PER_GROUP } from "../src/server/neighbors";

const total = (r: Awaited<ReturnType<typeof neighbors>>, key: string) => r!.groups.find((g) => g.key === key)?.total;

// US1: Rina Hapsari (K017) on the snapshot date.
const rina = await neighbors({ id: "K017", label: "Kontak", asOf: SNAPSHOT });
assert.ok(rina);
assert.equal(total(rina, "SALING_KENAL|Kontak|both"), 12);
assert.equal(total(rina, "TERLIBAT_DI|Interaksi|out"), 7);
assert.equal(total(rina, "PERNAH_BEKERJA_DI|Organisasi|out"), 1);
assert.equal(total(rina, "PERNAH_BEKERJA_DI|Akun|out"), 1);
assert.equal(total(rina, "BEKERJA_DI|Akun|out"), 1);
assert.equal(total(rina, "CHAMPION_DARI|Akun|out"), 1);
assert.deepEqual(rina.groups.map((g) => g.total), [...rina.groups.map((g) => g.total)].sort((a, b) => b - a));
for (const g of rina.groups) {
  assert.equal(g.nodes.length, g.edges.length);
  assert.ok(g.edges.every((e) => e.origin === "graph" && e.evidence.length === 0 && (e.from === "K017" || e.to === "K017")));
  assert.ok(g.nodes.every((n) => n.explored && n.type === g.label));
}

// US4: before her P01 job (2026-09-01) and before I0290 (2026-08-14).
const early = await neighbors({ id: "K017", label: "Kontak", asOf: "2026-08-01" });
assert.equal(total(early, "BEKERJA_DI|Akun|out"), undefined);
assert.equal(total(early, "TERLIBAT_DI|Interaksi|out"), 6);
assert.ok(early!.hidden >= 2, `hidden ${early!.hidden}`);
assert.ok(!existedOn({ bulan: "2026-11" }, {}, "2026-10-01"));
assert.ok(existedOn({ bulan: "2026-10" }, {}, "2026-10-01"));
assert.ok(existedOn({}, {}, "2020-01-01"), "undated neighbors are kept");

// Hubs: C01 has 42 outlets; the group is capped but reports the true total. MEMAKAI collapses per feature.
const c01 = await neighbors({ id: "C01", label: "Akun", asOf: SNAPSHOT });
const outlets = c01!.groups.find((g) => g.key === "MEMILIKI|Outlet|out")!;
assert.equal(outlets.total, 42);
assert.equal(outlets.nodes.length, PER_GROUP);
const usage = c01!.groups.find((g) => g.type === "MEMAKAI")!;
assert.equal(new Set(usage.nodes.map((n) => n.id)).size, usage.nodes.length);
assert.ok(usage.edges.some((e) => (e.count ?? 1) > 1));

// Unknown and hostile ids find nothing and change nothing.
const before = (await graph().executeQuery("MATCH (n) RETURN count(n) AS n")).records[0].get("n");
assert.equal(await neighbors({ id: "NOPE", label: "Kontak", asOf: SNAPSHOT }), null);
assert.equal(await neighbors({ id: "x'}) DETACH DELETE n //", label: "Kontak", asOf: SNAPSHOT }), null);
assert.equal((await graph().executeQuery("MATCH (n) RETURN count(n) AS n")).records[0].get("n"), before);

// US7: the new ID formats cite file + row; outlet and contract ids are not cut short at the account id.
assert.deepEqual(citesIn("C01-O01 K-C01").map((c) => c.id), ["C01-O01", "K-C01"]);
for (const [id, file] of [["T0001", "support_tickets.csv"], ["C01-O01", "outlets.csv"], ["K-C01", "contracts_billing.csv"], ["BUG-398", "bugs.csv"]])
  assert.deepEqual(citesIn(id).map((c) => [c.id, c.file, c.row]), [[id, file, 2]]);
const ticket = (await neighbors({ id: "C01-O01", label: "Outlet", asOf: SNAPSHOT }))!.groups.flatMap((g) => g.nodes).find((n) => n.type === "Tiket");
if (ticket) assert.equal(ticket.cite?.file, "support_tickets.csv");

await graph().close();
console.log("graph neighbors: groups, as-of, caps, not-found, cites pass");
