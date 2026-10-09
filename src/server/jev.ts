import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { choice, noul, TypeSafeClient, type Questions } from "@typesafe-ai/sdk";
import type { Row } from "./dataset";
import { NONE, type Judgment } from "./discovery";
import { hashOf, QUESTIONS_VERSION, stateOf } from "./judgments";

// Every Jev request goes through send(): scripts/judge-interactions.mts (judge) and the chat (checkAnswer).
// Wording changes need a new QUESTIONS_VERSION in ./judgments or a new CHECK_VERSION below.

// The lecturer pays for TypeSafe: at most 100M input tokens per team, ever. Every request is appended to this
// ledger (successes with the usage TypeSafe returns, failures with our estimate), and send() refuses a request
// that could cross the limit. The ledger is committed so the whole team counts against one total.
export const tokenLimit = () => Number(process.env.JEV_TOKEN_LIMIT || 100_000_000);
export const LEDGER = process.env.JEV_USAGE_FILE || join(process.cwd(), "jev-usage.jsonl");

type Base = { at: string; version: string; purpose?: "chat_check"; interaction_id?: string };
type Entry =
  | (Base & { ok: true; model: string; usage: { input_tokens: number; output_tokens: number }; answers: unknown })
  | (Base & { ok: false; error: string; estimated_input_tokens: number });

export class BudgetError extends Error {}

export function spent() {
  let input = 0;
  let output = 0;
  let requests = 0;
  if (!existsSync(LEDGER)) return { input, output, requests };
  for (const line of readFileSync(LEDGER, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const e = JSON.parse(line) as Entry; // a corrupt line throws: better to stop than to undercount
    input += e.ok ? e.usage.input_tokens : e.estimated_input_tokens;
    output += e.ok ? e.usage.output_tokens : 0;
    requests++;
  }
  return { input, output, requests };
}

// ponytail: characters of the JSON sent / 1.5. Real requests on jev-1.13.0 billed ~2.0 characters per token,
// so this runs ~35% high on purpose. Recheck against the ledger if the questions or the model change.
const tokensFor = (state: unknown, questions: Questions) => Math.ceil(JSON.stringify({ state, questions }).length / 1.5);

let client: TypeSafeClient | undefined;
let reserved = 0; // estimates of requests in flight in this process, so concurrent calls can't jointly overshoot

async function send<Q extends Questions>(state: unknown, questions: Q, base: Omit<Base, "at">) {
  // Only 429 is retried (rejected before any work). A resent timeout or 5xx may be billed without us seeing it.
  client ??= new TypeSafeClient({ retry: { httpStatuses: new Set([429]), apiConnectionError: false, apiTimeoutError: false } });
  const cost = tokensFor(state, questions);
  const limit = tokenLimit();
  const used = spent().input; // re-read every time: the judge script and the chat server share one ledger
  if (used + reserved + cost > limit) {
    throw new BudgetError(`Batas ${limit.toLocaleString("id-ID")} token input tercapai (terpakai ${used.toLocaleString("id-ID")}). Tidak ada request yang dikirim.`);
  }
  reserved += cost;
  const at = new Date().toISOString();
  try {
    const res = await client.systemOne({ state: state as never, questions });
    log({ at, ...base, ok: true, model: res.model, usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens }, answers: res.answers });
    return res;
  } catch (err) {
    log({ at, ...base, ok: false, error: err instanceof Error ? err.message : String(err), estimated_input_tokens: cost });
    throw err;
  } finally {
    reserved -= cost;
  }
}

// Synchronous append: the line is on disk before the next request can start.
const log = (e: Entry) => appendFileSync(LEDGER, `${JSON.stringify(e)}\n`);

// ---- Discovery: what an interaction claims (PRD_JEV.md §8)

const who = (candidates: ReturnType<typeof stateOf>["candidates"]) => ({
  ...Object.fromEntries(candidates.map((c) => [c.id, c.description])),
  [NONE]: "Teks tidak menunjuk orang tertentu di antara kandidat ini.",
});

function questions(candidates: ReturnType<typeof stateOf>["candidates"]) {
  return {
    dm_claim: noul("Apakah teks ini menyatakan siapa yang memegang keputusan pembelian atau pengadaan?", {
      true: "Menyebut nama atau menggambarkan orang atau jabatan yang memutuskan pembelian.",
      false: "Tidak ada pernyataan tentang siapa yang memutuskan pembelian.",
    }),
    dm_who: choice("Siapa yang dimaksud teks ini sebagai pemutus pembelian?", who(candidates)),
    sign_claim: noul("Apakah teks ini menyatakan siapa yang menandatangani kontrak atau memberi persetujuan akhir?", {
      true: "Menyebut nama atau jabatan penandatangan atau penyetuju akhir.",
      false: "Tidak ada pernyataan tentang penandatangan atau penyetuju akhir.",
    }),
    sign_who: choice("Siapa yang dimaksud teks ini sebagai penandatangan atau penyetuju akhir?", who(candidates)),
    technical_who: choice("Siapa yang dinyatakan hanya atau terutama menilai sisi teknis solusi?", who(candidates)),
    reference_request: noul("Apakah prospek meminta referensi dari pelanggan yang sudah memakai produk?"),
  };
}

export const estimate = (i: Row) => {
  const s = stateOf(i);
  return tokensFor(s.state, questions(s.candidates));
};

export async function judge(i: Row) {
  const s = stateOf(i);
  const res = await send(s.state, questions(s.candidates), { version: QUESTIONS_VERSION, interaction_id: i.interaction_id });
  const pick = (a: { choice: string; probabilities: Record<string, number> }) => ({ choice: a.choice, probabilities: { ...a.probabilities } });
  const answers: Judgment = {
    dm_claim: res.answers.dm_claim.noul,
    dm_who: pick(res.answers.dm_who),
    sign_claim: res.answers.sign_claim.noul,
    sign_who: pick(res.answers.sign_who),
    technical_who: pick(res.answers.technical_who),
    reference_request: res.answers.reference_request.noul,
  };
  return { answers, model: res.model, hash: hashOf(s), usage: res.usage };
}

// ---- Chat: does the LLM's answer stay within the query results? (PRD_DECISION_MAKER_DISCOVERY.md FR-11)

export const CHECK_VERSION = "c1";
export const CHECK_THRESHOLD = 0.5; // below this the chat warns that some claims may not be backed by the results
const CHECK_CHARS = 24_000; // ~16k tokens at most per check; the rows are cut, never the answer

// Opt-in: every chat question then spends Jev tokens from the lecturer's budget.
export const checkEnabled = () => process.env.JEV_CHAT_CHECK === "1" && !!process.env.TYPESAFE_API_KEY?.trim();

export type Check = { supported: number; warn: boolean; model: string } | { skipped: string };

export async function checkAnswer(input: { question: string; answer: string; context: string; results: string[] }): Promise<Check> {
  let room = CHECK_CHARS - input.answer.length - input.question.length - input.context.length;
  const bukti = input.results.map((r) => {
    const cut = r.slice(0, Math.max(0, room));
    room -= cut.length;
    return cut;
  });
  try {
    const res = await send(
      { pertanyaan: input.question, konteks: input.context, jawaban: input.answer, hasil_query: bukti },
      {
        supported: noul(
          "Apakah setiap pernyataan fakta dalam jawaban (nama, jabatan, angka, tanggal, ID, status) didukung oleh hasil_query atau konteks?",
          {
            true: "Semua fakta dalam jawaban muncul di hasil_query atau konteks, atau jawaban menyatakan datanya tidak ada.",
            false: "Ada fakta dalam jawaban yang tidak muncul di hasil_query atau konteks, atau bertentangan dengannya.",
          },
        ),
      },
      { version: CHECK_VERSION, purpose: "chat_check" },
    );
    const supported = res.answers.supported.noul;
    return { supported, warn: supported < CHECK_THRESHOLD, model: res.model };
  } catch (err) {
    console.error("jev chat check", err);
    return { skipped: err instanceof BudgetError ? "kuota Jev habis" : "Jev tidak bisa dihubungi" };
  }
}
