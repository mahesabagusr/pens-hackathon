// Acceptance tests AT-01..AT-05 from PRD_DECISION_MAKER_DISCOVERY.md §13, against the real dataset.
// Run: npx tsx scripts/check-discovery.mts
import assert from "node:assert/strict";
import { discover } from "../src/server/discovery";

const roles = (d: ReturnType<typeof discover>, name: string) => d!.people.find((p) => p.name === name)?.roles ?? [];

// AT-01: P01 decision maker is Rina, cross-source, backed by I0343 + employment history.
const p01 = discover("P01")!;
assert.equal(p01.decisionMaker.status, "teridentifikasi_lintas_sumber");
assert.equal(p01.people.find((p) => p.id === p01.decisionMaker.personId)?.name, "Rina Hapsari");
assert.ok(p01.decisionMaker.evidence.some((e) => e.startsWith("interactions.jsonl:343:")));
assert.ok(p01.decisionMaker.evidence.some((e) => e.startsWith("contact_employment_history.csv:24:")));

// AT-02: Fajar is the technical evaluator, not the decision maker.
assert.ok(roles(p01, "Fajar Nugraha").includes("evaluator"));
assert.ok(!roles(p01, "Fajar Nugraha").includes("decision_maker"));
assert.ok(p01.steps[0].text.includes("Fajar") && p01.steps[0].text.includes("Rina"));

// AT-03: P03 stays unidentified; Ratna is a discovery contact only, Hanif only a candidate.
const p03 = discover("P03")!;
assert.equal(p03.decisionMaker.status, "belum_teridentifikasi");
assert.equal(p03.decisionMaker.personId, null);
assert.deepEqual(roles(p03, "Ratna Dewi"), ["discovery_contact"]);
assert.deepEqual(roles(p03, "Hanif Maulana"), ["candidate"]);
assert.ok(p03.steps[0].text.includes("Ratna"));

// AT-04: temporal. Before 15 Aug 2026 Rina is at C01 and not at P01; the P01 claim does not exist yet.
assert.ok(discover("C01", "2026-08-01")!.people.some((p) => p.name === "Rina Hapsari"));
assert.ok(!discover("C01")!.people.some((p) => p.name === "Rina Hapsari"));
assert.ok(!discover("P01", "2026-08-01")!.people.some((p) => p.name === "Rina Hapsari"));
assert.equal(discover("P01", "2026-08-01")!.decisionMaker.status, "belum_teridentifikasi");

// AT-05: precedent. FEAT-07 promise at C01 reaches P01 through Rina, flagged as unproven impact.
const feat07 = p01.precedents.find((p) => p.id === "D-2025-11")!;
assert.ok(feat07.promise?.includes("Belum ditepati"));
assert.ok(feat07.link.includes("belum terbukti"));

// AT-06 (shape): another account answers dynamically. P04's signer is found by role, the decision maker is not.
const p04 = discover("P04")!;
assert.equal(p04.approver?.status, "teridentifikasi_lintas_sumber");
assert.equal(p04.decisionMaker.status, "belum_teridentifikasi");

// Every cited evidence id resolves to a stored record.
for (const d of [p01, p03, p04]) {
  const ids = new Set(d.evidence.map((e) => e.id));
  for (const id of [...d.decisionMaker.evidence, ...d.steps.flatMap((s) => s.evidence), ...d.people.flatMap((p) => p.evidence)]) assert.ok(ids.has(id), id);
}

console.log("discovery: AT-01..AT-06 pass");
