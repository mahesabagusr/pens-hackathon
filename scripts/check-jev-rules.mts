// Jev judgments drive discovery's claim rules (PRD_JEV.md §13 US1, US3, US4, US6). Fixture judgments only: no API, no network.
// Run: npx tsx scripts/check-jev-rules.mts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Row } from "../src/server/dataset";
import { discover, NONE, type Judgment, type Judgments } from "../src/server/discovery";

// tsx gives this ESM import of dataset.ts its own module instance, separate from the one discovery.ts requires.
// Loading it through require reaches the instance discover() reads, so the extra rows below are seen.
const { dataset } = createRequire(import.meta.url)("../src/server/dataset.ts") as typeof import("../src/server/dataset");

const pick = (choice: string = NONE, p = 0.9, others: Record<string, number> = {}) => ({ choice, probabilities: { ...others, [choice]: p } });
const J = (o: Partial<Judgment> = {}): Judgment => ({
  dm_claim: 0, dm_who: pick(), sign_claim: 0, sign_who: pick(), technical_who: pick(), reference_request: 0, ...o,
});
const judged = (m: Record<string, Judgment>): Judgments => ({ model: "fixture", version: "q1", byInteraction: new Map(Object.entries(m)) });

const d = dataset();
const fajar = d.contacts.find((c) => c.nama === "Fajar Nugraha")!;
const steven = d.contacts.find((c) => c.nama === "Steven Wijaya")!;
// Extra P01 interactions for one scenario at a time; removed again afterwards so scenarios stay independent.
const withTalks = (rows: Partial<Row>[], run: () => void) => {
  const added = rows.map((r, n) => ({ tipe: "email", account_id: "P01", dari: fajar.email, ke: "bagus@kasirnusa.id", peserta: "", subjek: "Re: Proposal", membalas_id: "", _row: String(9000 + n), ...r }) as Row);
  d.interactions.push(...added);
  try {
    run();
  } finally {
    d.interactions.splice(d.interactions.length - added.length, added.length);
  }
};
const status = (j?: Judgments) => discover("P01", undefined, j)!.decisionMaker;

// US1: I0343 read by Jev gives the same answer as the keyword rule, now marked as Jev's reading.
const p01 = discover("P01", undefined, judged({ I0343: J({ dm_claim: 0.97, dm_who: pick("K017", 0.93), technical_who: pick(fajar.contact_id, 0.91) }) }))!;
assert.equal(p01.decisionMaker.status, "teridentifikasi_lintas_sumber");
assert.equal(p01.decisionMaker.personId, "K017");
assert.ok(p01.decisionMaker.evidence.some((e) => e.startsWith("interactions.jsonl:343:")));
assert.ok(p01.decisionMaker.evidence.some((e) => e.startsWith("contact_employment_history.csv:24:")));
assert.match(p01.decisionMaker.why, /Jev mencocokkannya dengan Rina Hapsari \(0,93\)/);
assert.deepEqual(p01.evidence.find((e) => e.id.startsWith("interactions.jsonl:343:"))!.claims, [
  { kind: "technical", by: "jev", p: 0.91 },
  { kind: "dm", by: "jev", p: 0.97 },
]);
assert.ok(p01.people.find((p) => p.id === fajar.contact_id)!.roles.includes("evaluator"));
assert.equal(p01.method.jev, 1);
assert.equal(p01.method.model, "fixture");

// US1: a paraphrase the keyword rule misses is found when Jev reads it, by role (her name is not in the text).
const paraphrase = { interaction_id: "I9001", tanggal: "2026-09-26", isi: "Proposal sudah saya teruskan ke kepala operasional yang baru masuk, beliau yang pegang keputusannya." };
const quiet = { I0343: J() }; // I0343 read as claiming nothing, so only the paraphrase can identify anyone
withTalks([paraphrase], () => {
  assert.equal(status(judged(quiet)).status, "belum_teridentifikasi", "no judgment for I9001 and a silent I0343: nobody");
  const found = status(judged({ ...quiet, I9001: J({ dm_claim: 0.95, dm_who: pick("K017", 0.9) }) }));
  assert.equal(found.status, "teridentifikasi_lintas_sumber");
  assert.equal(found.personId, "K017");
  assert.ok(found.evidence.some((e) => e.startsWith("interactions.jsonl:9000:")));
});

// US1: a pick who did not work at P01 on the day the text was written is not accepted, and the why says so.
withTalks([{ ...paraphrase, tanggal: "2026-08-20" }], () => {
  const f = status(judged({ ...quiet, I9001: J({ dm_claim: 0.95, dm_who: pick("K017", 0.95) }) }));
  assert.equal(f.status, "belum_teridentifikasi");
  assert.equal(f.personId, null);
  assert.match(f.why, /Jev menunjuk Rina Hapsari \(0,95\), tetapi riwayat jabatan tidak mendukung/);
});

// US3: the real first P01 answer. Jev is unsure only whether anyone is named, not who: Rina is accepted.
const real = status(judged({ I0343: J({ dm_claim: 0.96, dm_who: pick("K017", 0.71, { [NONE]: 0.29, K052: 0, K089: 0 }) }) }));
assert.equal(real.status, "teridentifikasi_lintas_sumber");
assert.equal(real.personId, "K017");
assert.match(real.why, /Jev mencocokkannya dengan Rina Hapsari \(0,71\), tanpa kandidat lain di atas 0,20/);

// US3: the same 0.71, but another person competes for the role: not accepted, and the why names the rival.
const rival = status(judged({ I0343: J({ dm_claim: 0.96, dm_who: pick("K017", 0.71, { [fajar.contact_id]: 0.29 }) }) }));
assert.equal(rival.status, "belum_teridentifikasi");
assert.match(rival.why, /Jev menunjuk Rina Hapsari \(0,71\), tetapi Fajar Nugraha juga 0,29, di atas batas pesaing 0,20\. Perlu verifikasi\./);

// US3: a weak pick leaves the status open and names the pick.
const low = status(judged({ I0343: J({ dm_claim: 0.97, dm_who: pick("K017", 0.55, { [NONE]: 0.45 }) }) }));
assert.equal(low.status, "belum_teridentifikasi");
assert.match(low.why, /Jev menunjuk Rina Hapsari \(0,55\), di bawah ambang 0,60\. Perlu verifikasi\./);

// US3: two texts naming different people above the threshold make both candidates, not a fact.
withTalks([{ interaction_id: "I9002", tanggal: "2026-09-28", isi: `Keputusan akhir nanti di Pak ${steven.nama}.` }], () => {
  const f = status(judged({ I0343: J({ dm_claim: 0.97, dm_who: pick("K017", 0.93) }), I9002: J({ dm_claim: 0.9, dm_who: pick(steven.contact_id, 0.9) }) }));
  assert.equal(f.status, "kandidat");
  assert.equal(f.personId, null);
});

// US3: Jev saying "no claim" wins over a keyword match in the same text.
assert.equal(status(judged({ I0343: J({ dm_claim: 0.3, dm_who: pick("K017", 0.93) }) })).status, "belum_teridentifikasi");

// US3 / AT-03: P03 with every interaction read as claiming nothing stays open; Ratna only a contact, Hanif only a candidate.
const p03Talks = d.interactions.filter((i) => i.account_id === "P03").map((i) => i.interaction_id);
const p03 = discover("P03", undefined, judged(Object.fromEntries(p03Talks.map((id) => [id, J()]))))!;
assert.equal(p03.decisionMaker.status, "belum_teridentifikasi");
assert.deepEqual(p03.people.find((p) => p.name === "Ratna Dewi")!.roles, ["discovery_contact"]);
assert.deepEqual(p03.people.find((p) => p.name === "Hanif Maulana")!.roles, ["candidate"]);
assert.equal(p03.method.rules, 0);

// US4: no judgments means the keyword rules, marked as such.
const rules = discover("P01")!;
assert.equal(rules.decisionMaker.personId, "K017");
assert.deepEqual(rules.method, { jev: 0, rules: rules.method.rules, model: null, version: null });
assert.ok(rules.evidence.find((e) => e.id.startsWith("interactions.jsonl:343:"))!.claims!.every((c) => c.by === "rules" && c.p === undefined));

console.log("jev rules: identify, paraphrase, date check, real 0.71, rival, threshold, contradiction, no-claim, P03, fallback pass");
