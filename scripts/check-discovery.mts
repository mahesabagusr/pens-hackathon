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

// AT-11 (PRD_CONTACT_PLAN.md): P01 contact plan. Rina first, introduced by Fajar, then by Sari from C01; the unkept
// FEAT-07 promise is something to prepare, never a prediction of how she will react.
const [rina, fajar] = p01.contacts.entries;
assert.equal(rina.personId, "K017");
assert.equal(rina.role, "Pemutus pengadaan · lintas sumber");
assert.ok(rina.evidence.some((e) => e.startsWith("interactions.jsonl:343:")) && rina.evidence.some((e) => e.startsWith("contact_employment_history.csv:24:")));
assert.deepEqual(rina.routes.map((r) => r.kind), ["intro_contact", "intro_staff"], "never contacted at P01, so no direct route");
assert.ok(rina.routes[0].kind === "intro_contact" && rina.routes[0].via === "K052" && rina.routes[0].note.includes("I0343"));
assert.ok(rina.routes[1].kind === "intro_staff" && rina.routes[1].note.includes("Sari Puspita") && rina.routes[1].note.includes("Kopi Lintas Nusantara"));
for (const id of ["I0051", "I0066", "I0223"]) assert.ok(rina.evidence.some((e) => e.startsWith(`interactions.jsonl:${+id.slice(1)}:`)), id);
const promise = rina.prepare.find((p) => p.text.includes("D-2025-11"))!;
assert.ok(promise.text.includes("Belum ditepati") && promise.text.includes("Kopi Lintas Nusantara"));
for (const forbidden of [/akan menolak/i, /\bpasti\b/i, /tidak akan/i]) assert.doesNotMatch(promise.text, forbidden);
assert.deepEqual(rina.last && [rina.last.date, rina.last.interactionId, rina.last.accountId], ["2026-08-14", "I0290", "C01"]);
assert.equal(fajar.personId, "K052");
assert.deepEqual(fajar.routes.map((r) => r.kind), ["direct"]);
assert.deepEqual(fajar.last && [fajar.last.date, fajar.last.interactionId], ["2026-09-24", "I0343"]);
assert.deepEqual(p01.contacts.notYet.map((n) => [n.personId, n.askVia]), [["K089", "K017"]], "Steven only under not yet, ask Rina");

// AT-12: P03. Ask Ratna, bring the reference she asked for; Hanif is not contacted cold and nobody is called pemutus.
const [ratna] = p03.contacts.entries;
assert.equal(p03.contacts.entries.length, 1);
assert.equal(ratna.personId, "K049");
assert.deepEqual(ratna.routes.map((r) => r.kind), ["direct"]);
assert.ok(ratna.ask.includes("menyetujui anggaran"));
assert.ok(ratna.prepare.some((p) => p.text.includes("I0334") && /referensi/i.test(p.text)));
assert.deepEqual(p03.contacts.notYet.map((n) => [n.personId, n.askVia]), [["K114", "K049"]]);
assert.ok(!p03.contacts.entries.some((e) => /pemutus/i.test(e.role)));

// AT-13: P04. The signer Hartono through Yuli, with the reference he wants before signing; Yuli reachable directly.
const [hartono, yuli] = p04.contacts.entries;
assert.equal(hartono.personId, "K028");
assert.deepEqual(hartono.routes.map((r) => r.kind), ["intro_contact"]);
assert.ok(hartono.routes[0].note.includes("Yuli Astuti") && hartono.routes[0].note.includes("I0335"));
assert.ok(hartono.prepare.some((p) => /referensi/i.test(p.text) && p.text.includes("I0335")));
assert.equal(hartono.last, null);
assert.equal(yuli.personId, "K065");
assert.deepEqual(yuli.routes.map((r) => r.kind), ["direct"]);
assert.equal(yuli.last?.interactionId, "I0335");

// AT-14: edges. No contacts at P05; before 1 Sep 2026 Rina is not in P01's plan; C01 asks the most recent contact (CFO Yoga).
const p05 = discover("P05")!;
assert.deepEqual([p05.contacts.entries.length, p05.contacts.notYet.length], [0, 0]);
assert.equal(p05.contacts.owner, "Citra Ayuningtyas");
const p01Aug = discover("P01", "2026-08-01")!;
assert.ok(!p01Aug.contacts.entries.some((e) => e.personId === "K017") && !p01Aug.contacts.entries.some((e) => /pemutus/i.test(e.role)));
assert.equal(discover("C01")!.contacts.entries[0]?.personId, "K134");

// Every cited evidence id resolves to a stored record.
for (const d of [p01, p03, p04, p05, p01Aug]) {
  const ids = new Set(d.evidence.map((e) => e.id));
  const plan = [...d.contacts.entries.flatMap((e) => e.evidence), ...d.contacts.notYet.flatMap((n) => n.evidence)];
  for (const id of [...d.decisionMaker.evidence, ...d.steps.flatMap((s) => s.evidence), ...d.people.flatMap((p) => p.evidence), ...plan]) assert.ok(ids.has(id), id);
}

console.log("discovery: AT-01..AT-06, AT-11..AT-14 pass");
