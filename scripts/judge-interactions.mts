// Asks Jev to read every external interaction and stores the answers for discover() (PRD_JEV.md §9).
// Run:  npx tsx scripts/judge-interactions.mts [--dry-run] [--limit N] [--account P01] [--report]
//   --dry-run  count what would be judged and estimate input tokens; no API calls
//   --report   compare stored Jev answers with the keyword rules and the gold labels; no API calls
// Needs TYPESAFE_API_KEY in .env (not for --dry-run or --report) and `npm run db:up`.
// Every request is logged to jev-usage.jsonl and counted against the team's 100M input-token limit
// (src/server/jev.ts). Commit that file after a run so teammates count against the same total.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dataset } from "../src/server/dataset";
import { db } from "../src/server/db";
import { keywordClaims, pickOf, THRESHOLDS, type Judgment } from "../src/server/discovery";
import { BudgetError, estimate, judge, LEDGER, spent, tokenLimit } from "../src/server/jev";
import { hashOf, QUESTIONS_VERSION, stateOf } from "../src/server/judgments";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const limit = Number(value("--limit") ?? Infinity);
const n = (x: number) => x.toLocaleString("id-ID");
const account = value("--account");

const talks = dataset().interactions.filter((i) => i.tipe !== "email_internal" && (!account || i.account_id === account));
const stored = new Map(
  (await db.jevJudgment.findMany({ where: { version: QUESTIONS_VERSION, interaction_id: { in: talks.map((i) => i.interaction_id) } } })).map((r) => [r.interaction_id, r]),
);

if (flag("--report")) {
  await report();
} else {
  const pending = talks.filter((i) => stored.get(i.interaction_id)?.state_hash !== hashOf(stateOf(i)));
  const todo = pending.slice(0, limit);
  const tokens = todo.reduce((n, i) => n + estimate(i), 0);
  const later = pending.length - todo.length ? `, ${pending.length - todo.length} ditunda oleh --limit` : "";
  console.log(`${todo.length} interaksi akan dinilai, ${talks.length - pending.length} dilewati (sudah dinilai)${later}, versi ${QUESTIONS_VERSION}. Perkiraan input: ~${n(tokens)} token.`);
  const total = spent();
  console.log(`Kuota tim: ${n(total.input)} dari ${n(tokenLimit())} token input terpakai (${total.requests} request di ${LEDGER}), sisa ${n(tokenLimit() - total.input)}.`);
  if (todo.length && total.input + tokens > tokenLimit()) {
    console.error("Perkiraan run ini melewati kuota. Tidak ada yang dikirim; perkecil dengan --limit atau --account.");
    process.exitCode = 1;
  } else if (!flag("--dry-run") && todo.length) await run(todo, talks.length - pending.length);
}
await db.$disconnect();

async function run(todo: typeof talks, skipped: number) {
  if (!process.env.TYPESAFE_API_KEY?.trim()) {
    console.error("TYPESAFE_API_KEY belum diisi di .env. Aplikasi tetap memakai aturan kata kunci.");
    process.exit(1);
  }
  const failed: string[] = [];
  let stopped: string | undefined;
  let done = 0;
  let input = 0;
  let output = 0;
  // Four at a time; the SDK retries rate limits and timeouts itself, so a failure here is final for this run.
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let i = queue.shift(); i; i = queue.shift()) {
        try {
          const r = await judge(i);
          const row = { answers: r.answers, model: r.model, state_hash: r.hash, input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens };
          await db.jevJudgment.upsert({
            where: { interaction_id_version: { interaction_id: i.interaction_id, version: QUESTIONS_VERSION } },
            create: { interaction_id: i.interaction_id, version: QUESTIONS_VERSION, ...row },
            update: { ...row, created_at: new Date() },
          });
          input += r.usage.input_tokens;
          output += r.usage.output_tokens;
          if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
        } catch (err) {
          if (err instanceof BudgetError) {
            stopped = err.message;
            queue.length = 0; // stop every worker; nothing else is sent
            break;
          }
          failed.push(i.interaction_id);
          console.error(`  gagal ${i.interaction_id}:`, err instanceof Error ? err.message : err);
        }
      }
    }),
  );
  console.log(`${done} dinilai, ${skipped} dilewati, ${failed.length} gagal. Token run ini: ${n(input)} input, ${n(output)} output.`);
  console.log(`Kuota tim: ${n(spent().input)} dari ${n(tokenLimit())} token input terpakai.`);
  if (stopped) {
    console.error(`Berhenti: ${stopped}`);
    process.exitCode = 1;
  }
  if (failed.length) {
    console.error(`Gagal: ${failed.join(", ")}. Jalankan lagi untuk mencoba ulang yang gagal saja.`);
    process.exitCode = 1;
  }
}

async function report() {
  type Gold = { interaction_id: string; source: string } & Partial<Record<"dm_claim" | "sign_claim" | "reference_request", boolean>> &
    Partial<Record<"dm_who" | "sign_who" | "technical_who", string | null>>;
  const gold: Gold[] = JSON.parse(readFileSync(new URL("./jev-gold.json", import.meta.url), "utf8"));
  const valid = talks.filter((i) => stored.get(i.interaction_id)?.state_hash === hashOf(stateOf(i)));
  console.log(`Penilaian tersimpan dan masih cocok dengan data: ${valid.length} dari ${talks.length} interaksi (versi ${QUESTIONS_VERSION}).`);
  if (!valid.length) return console.log("Belum ada yang bisa dibandingkan. Jalankan tanpa --report dulu.");

  const answers = (id: string) => stored.get(id)!.answers as Judgment;
  const yes = { dm: "dm_claim", sign: "sign_claim", reference: "reference_request" } as const;

  console.log(`\nBeda antara Jev (ambang ${THRESHOLDS.claim}) dan aturan kata kunci:`);
  let diffs = 0;
  for (const i of valid) {
    const rules = keywordClaims(i.isi);
    for (const [kind, q] of Object.entries(yes) as [keyof typeof yes, (typeof yes)[keyof typeof yes]][]) {
      const p = answers(i.interaction_id)[q];
      if (p >= THRESHOLDS.claim === rules[kind]) continue;
      diffs++;
      console.log(`  ${i.interaction_id} ${q}: Jev ${p.toFixed(2)}, aturan ${rules[kind] ? "ya" : "tidak"}  "${i.isi.slice(0, 90)}"`);
    }
  }
  if (!diffs) console.log("  tidak ada");

  const labeled = gold.filter((g) => valid.some((i) => i.interaction_id === g.interaction_id));
  console.log(`\nLabel emas: ${gold.length} di scripts/jev-gold.json, ${labeled.length} sudah dinilai Jev. Target PRD: 30.`);
  for (const q of ["dm_claim", "sign_claim", "reference_request"] as const) {
    const rows = labeled.filter((g) => g[q] !== undefined);
    if (!rows.length) continue;
    const kind = (Object.keys(yes) as (keyof typeof yes)[]).find((k) => yes[k] === q)!;
    const score = (said: (g: Gold) => boolean) => {
      const tp = rows.filter((g) => said(g) && g[q]).length;
      const fp = rows.filter((g) => said(g) && !g[q]).length;
      const fn = rows.filter((g) => !said(g) && g[q]).length;
      return `presisi ${tp + fp ? (tp / (tp + fp)).toFixed(2) : "-"}, recall ${tp + fn ? (tp / (tp + fn)).toFixed(2) : "-"}`;
    };
    const text = (g: Gold) => dataset().interactions.find((i) => i.interaction_id === g.interaction_id)!.isi;
    console.log(`  ${q} (${rows.length} label): Jev ${score((g) => answers(g.interaction_id)[q] >= THRESHOLDS.claim)} | aturan ${score((g) => keywordClaims(text(g))[kind])}`);
  }
  for (const q of ["dm_who", "sign_who", "technical_who"] as const) {
    const rows = labeled.filter((g) => g[q] !== undefined);
    if (!rows.length) continue;
    const right = rows.filter((g) => {
      const pick = pickOf(answers(g.interaction_id)[q]);
      return (pick?.sure ? pick.id : null) === (g[q] ?? null);
    }).length;
    console.log(`  ${q} (${rows.length} label): Jev tepat ${right}/${rows.length} (pilihan ≥ ${THRESHOLDS.pick}, pesaing ≤ ${THRESHOLDS.rival})`);
  }
}
