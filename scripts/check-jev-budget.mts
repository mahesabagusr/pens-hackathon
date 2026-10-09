// The Jev token budget (lecturer's 100M input-token cap per team) and the usage ledger, without TypeSafe:
// a temporary ledger and a fake fetch stand in for the API.
// Run: npx tsx scripts/check-jev-budget.mts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ledger = join(mkdtempSync(join(tmpdir(), "jev-budget-")), "jev-usage.jsonl");
writeFileSync(
  ledger,
  [
    { at: "2026-10-09T00:00:00Z", interaction_id: "I0001", version: "q1", ok: true, model: "jev-1.13.0", usage: { input_tokens: 1000, output_tokens: 200 }, answers: {} },
    { at: "2026-10-09T00:00:01Z", interaction_id: "I0002", version: "q1", ok: false, error: "timeout", estimated_input_tokens: 500 },
  ].map((e) => JSON.stringify(e) + "\n").join(""),
);
process.env.JEV_USAGE_FILE = ledger;
process.env.TYPESAFE_API_KEY = "test-key-not-real";

// Fake API: answers like TypeSafe after a short delay, or fails with 500 when told to.
let calls = 0;
let fail = false;
let yes = 0.1; // what every noul question answers
let lastState: unknown;
globalThis.fetch = (async (_url: string, init?: RequestInit) => {
  calls++;
  await new Promise((r) => setTimeout(r, 50));
  if (fail) return new Response(JSON.stringify({ error: "boom" }), { status: 500, headers: { "content-type": "application/json" } });
  const { questions, state } = JSON.parse(String(init!.body));
  lastState = state;
  const answers = Object.fromEntries(
    Object.entries(questions as Record<string, { type: string; criteria?: Record<string, unknown> }>).map(([k, q]) => [
      k,
      q.type === "noul" ? { type: "noul", noul: yes } : { type: "choice", choice: "tidak_disebut", confidence: 1, probabilities: Object.fromEntries(Object.keys(q.criteria!).map((c) => [c, c === "tidak_disebut" ? 1 : 0])) },
    ]),
  );
  return new Response(JSON.stringify({ model: "jev-1.13.0", answers, usage: { input_tokens: 900, output_tokens: 210 } }), { headers: { "content-type": "application/json" } });
}) as typeof fetch;

const { dataset } = await import("../src/server/dataset");
const i = dataset().interactions.find((x) => x.interaction_id === "I0343")!;
const lines = () => readFileSync(ledger, "utf8").trim().split("\n").length;

// Under the limit set below, exactly two requests fit: 1500 already spent plus two estimates.
const { BudgetError, estimate, judge, spent, tokenLimit } = await import("../src/server/jev");
const cost = estimate(i);
process.env.JEV_TOKEN_LIMIT = String(1500 + 2 * cost + Math.floor(cost / 2));
assert.equal(tokenLimit(), 1500 + 2 * cost + Math.floor(cost / 2));

// Failed requests count at their estimate.
assert.deepEqual(spent(), { input: 1500, output: 200, requests: 2 });
assert.ok(cost > 1047 * 1.2, `estimate ${cost} should sit well above the 1047 tokens I0343 really cost`);

// Three requests at once: two are sent, the third is refused before any network call, as the first two are still in flight.
const results = await Promise.allSettled([judge(i), judge(i), judge(i)]);
assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
const refused = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
assert.ok(refused.reason instanceof BudgetError, String(refused.reason));
assert.equal(calls, 2);
assert.equal(lines(), 4, "each sent request is one ledger line; the refused one is not");
assert.equal(spent().input, 1500 + 900 + 900);

// A failed request is logged at its estimate and counted; the SDK does not resend a 500 behind our back.
process.env.JEV_TOKEN_LIMIT = "100000000";
fail = true;
calls = 0;
await assert.rejects(judge(i));
assert.equal(calls, 1, "a 500 is not retried");
const last = JSON.parse(readFileSync(ledger, "utf8").trim().split("\n").at(-1)!);
assert.equal(last.ok, false);
assert.equal(last.estimated_input_tokens, cost);
assert.equal(spent().input, 1500 + 900 + 900 + cost);

// The ledger keeps what TypeSafe returned for a successful request.
const ok = JSON.parse(readFileSync(ledger, "utf8").trim().split("\n")[2]);
assert.deepEqual(ok.usage, { input_tokens: 900, output_tokens: 210 });
assert.equal(ok.model, "jev-1.13.0");
assert.equal(ok.interaction_id, "I0343");

// The chat check (FR-11): opt-in, logged to the same ledger, and it never throws at the chat.
const { checkAnswer, checkEnabled, CHECK_VERSION } = await import("../src/server/jev");
delete process.env.JEV_CHAT_CHECK;
assert.equal(checkEnabled(), false, "off unless JEV_CHAT_CHECK=1");
process.env.JEV_CHAT_CHECK = "1";
assert.equal(checkEnabled(), true);

fail = false;
yes = 0.94;
const input = { question: "Siapa pemutus di P01?", answer: "Rina Hapsari (K017), lihat I0343.", context: "The user is viewing account P01.", results: ["query 0: " + "x".repeat(40_000), "query 1: [{\"id\":\"K017\"}]"] };
const good = await checkAnswer(input);
assert.deepEqual(good, { supported: 0.94, warn: false, model: "jev-1.13.0" });
const sent = lastState as { jawaban: string; hasil_query: string[] };
assert.equal(sent.jawaban, input.answer, "the answer is never cut");
assert.ok(JSON.stringify(sent).length < 26_000, "query rows are cut to keep a check small");
const logged = JSON.parse(readFileSync(ledger, "utf8").trim().split("\n").at(-1)!);
assert.equal(logged.purpose, "chat_check");
assert.equal(logged.version, CHECK_VERSION);
assert.deepEqual(logged.usage, { input_tokens: 900, output_tokens: 210 });

yes = 0.32;
assert.deepEqual(await checkAnswer(input), { supported: 0.32, warn: true, model: "jev-1.13.0" });

fail = true;
assert.deepEqual(await checkAnswer(input), { skipped: "Jev tidak bisa dihubungi" });

fail = false;
process.env.JEV_TOKEN_LIMIT = String(spent().input + 10);
const callsBefore = calls;
assert.deepEqual(await checkAnswer(input), { skipped: "kuota Jev habis" });
assert.equal(calls, callsBefore, "over the cap: nothing sent");

console.log("jev budget: ledger totals, in-flight reservation, refusal before send, failures counted, no hidden retries, chat check pass");
