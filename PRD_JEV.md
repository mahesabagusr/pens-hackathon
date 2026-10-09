# PRD: Jev Text Judgments in Discovery

| | |
|---|---|
| Version | 0.1 draft |
| Date | 9 October 2026 |
| Builds on | [PRD_DECISION_MAKER_DISCOVERY.md](PRD_DECISION_MAKER_DISCOVERY.md): FR-09, FR-10, §9 rule 6, §11 Jev integration, §14 "Akses Jev" and "Ambang Jev" |
| Status | Ready for build once a TypeSafe API key exists. Open questions are listed in §14 |

## 1. Overview

**Feature name:** Jev Text Judgments

**Problem statement:**
`src/server/discovery.ts` decides what an email or meeting note *claims* with five regular expressions: `DM_CLAIM`, `SIGN_CLAIM`, `TECHNICAL`, `REFERENCE`, plus title matching. They work on the seeded wording ("Keputusan pengadaan sistem kasir ada di beliau") and fail on any paraphrase:
- "kepala operasional yang baru masuk yang pegang keputusannya" matches nothing.
- "sudah saya teruskan ke Pak Direktur, beliau yang tanda tangan" depends on exact keywords.

A judge who asks about another account gets "belum teridentifikasi" where a human reader would see a clear claim. The PRD promised Jev for this in FR-09, and the code carries a `ponytail:` note saying so.

**Proposed solution:**
- Ask Jev a fixed set of small typed questions about each external interaction, ahead of time, and store the answers in Postgres.
- `discover()` reads those stored answers in place of the regexes, and falls back to the regexes when an answer is missing.
- The app's evidence rules still decide every status. Jev only answers "does this text claim X" and "which of these known people is meant".

**AI build summary:**

> In the existing Next.js 16 app (Prisma/Postgres, synchronous `discover()` in `src/server/discovery.ts` reading `data/`), integrate TypeSafe Jev via `@typesafe-ai/sdk`:
>
> 1. Add a `JevJudgment` Prisma model: one row per interaction per question version, holding the answers JSON, model, state hash and token usage.
> 2. Add `src/server/jev.ts`. It defines `QUESTIONS_VERSION`, builds the state for one interaction (its text, sender, date, and the contacts at that account on that date as choice options) and calls `client.systemOne`.
> 3. Add `scripts/judge-interactions.mts`.
>    - Judges the 346 external interactions.
>    - Skips rows whose version and state hash already exist.
>    - Supports `--dry-run`, `--limit` and `--report` (rows where Jev and the regex disagree).
> 4. Change `discover(accountId, asOf, judged)` to take a judgments map.
>    - Use Jev answers above a threshold instead of the regexes.
>    - Keep the regexes as the fallback for interactions without a judgment.
>    - Keep every status rule. A Jev pick of a person still needs the employment-history join to count as "lintas sumber".
> 5. Show a "Jev 0.97" chip on text-claim evidence, and one line saying which method judged the text.
> 6. Jev is never called during a page request. With no API key and no rows, the app behaves exactly as today.

## 2. Goals & Success Metrics

**Primary goal:** Discovery recognizes authority, signature, evaluator and reference claims written in any natural wording, without weakening the rule that only cited, cross-checked evidence becomes "teridentifikasi".

**Success metrics:**
- **AT-01 to AT-06 still pass** with judgments loaded, and also with none loaded (`scripts/check-discovery.mts`).
- **Gold set:** on a hand-labeled set of 30 interactions (`scripts/jev-gold.json`), Jev claim detection beats the regexes on recall at equal or better precision. Both numbers are printed by `--report`.
- **Cost:** a full run of 346 interactions costs under 200k input tokens. A re-run with no changes makes 0 API calls.

**Anti-goals:**
- Not letting Jev decide status. A probability never turns a candidate into a fact (§9 rule 6, FR-10).
- Not calling Jev on page load. Since 10 Oct 2026 the chat may call Jev once per answer, as an opt-in check (`JEV_CHAT_CHECK=1`, see §15 Phase 2+); never for discovery during a request.
- Not replacing Gemini. The chat and its explanations stay as they are.
- Not judging structured fields. Titles (`SENIOR`), dates and IDs stay deterministic.
- Not inventing people. Jev chooses only from contact IDs the app supplies.

## 3. Scope & Constraints

**In scope:**
- Six questions per external interaction (§8): `dm_claim`, `dm_who`, `sign_claim`, `sign_who`, `technical_who` and `reference_request`.
- Storage, idempotent batch script, dry run, disagreement report with precision and recall on the gold set.
- `discover()` using judgments with regex fallback, plus fixture-based rule tests.
- **UI:** a Jev probability chip on evidence cards and a "Penilaian teks" method line. The decision-maker "why" text names the Jev pick when it falls below the threshold.

**Out of scope:**
- Competitor mentions in `load-neo4j.mts` (Phase 2).
- An evidence-strength `score` question (Phase 2).
- Judging new Sales notes when they're entered. No note input exists yet.
- Exposing judgments to the chat or Neo4j (Phase 2).
- An admin UI for running the judge. It's a script.

**Technical constraints:**
- **Platform:** web (existing). No new pages.
- **Auth:** no new endpoints. The script runs locally with `TYPESAFE_API_KEY`.
- **Accessibility:** WCAG 2.2 AA for the chip and the method line (text, not color alone).
- **Offline/demo safety:** the app must render identically when TypeSafe is unreachable, since judgments are read from Postgres and the regex fallback covers gaps.
- **Performance:** loading judgments adds ≤ 20 ms to a dashboard render (346 rows, one query, React `cache()` per request).
- **Data:** interaction text (≈ 43 characters on average, synthetic dataset) is sent to TypeSafe. Nothing else leaves the server: no user accounts, no Postgres data beyond the state described in §8.
- **Reproducibility (PRD §12):** every judgment stores the question version, the model reported by the API, and a hash of the exact state sent.

## 4. Jobs to Be Done

| Priority | Job Statement |
|---|---|
| J1 | When a prospect's email names the decision maker in its own words, I want discovery to recognize it, so I can approach the right person on any account, not just the seeded ones. |
| J2 | When I see an identified decision maker, I want to know whether a model or a keyword rule read the text, and how sure it was, so I can judge how much to trust it. |
| J3 | When the model is unsure or the API is down, I want the app to stay conservative and keep working, so a demo or a call prep never breaks. |
| J4 | As the developer, when I change a question's wording, I want only the affected interactions re-judged and a report of what changed, so I can tune thresholds from evidence. |

## 5. User Stories

| ID | Role | Action | Benefit | JTBD |
|---|---|---|---|---|
| US1 | Sales rep | I want paraphrased authority and signature claims recognized | so that discovery works on any account | J1 |
| US2 | Sales rep / judge | I want each text-claim evidence card to show whether Jev read it and with what probability | so that I can weigh it | J2 |
| US3 | Sales rep | I want low-confidence or conflicting Jev answers to keep the status conservative | so that I'm never pointed at the wrong person | J3 |
| US4 | Sales rep | I want the app to behave as today when Jev data is missing | so that nothing breaks | J3 |
| US5 | Developer | I want an idempotent judge script with dry run and a disagreement report | so that I control cost and can calibrate | J4 |
| US6 | Developer | I want rule tests that run on fixture judgments without the API | so that status logic is verified offline | J3, J4 |

## 6. Proposed Experience

**Design direction:**
Jev stays nearly invisible: the user doesn't "use Jev". What changes is that answers become correct in more cases, with one honest signal on the evidence itself. The mental model is a second reader whose confidence is shown next to what it read. That signal sits on the source text, not on the conclusion, so the status label keeps meaning exactly what it meant before.

**Key screens and states** (existing screens only):
- **Evidence card** (Jalur bukti panel, and any card with origin `text_claim` or `cross_source_match`):
  - Adds a chip after the origin line, for example **"Jev 0.97 · klaim pemutus"**. Mono numbers, `border-line`, muted text.
  - Accessible name: "Penilaian Jev: 97% kemungkinan teks ini menyebut pemutus pembelian."
  - When the claim came from the regex fallback, the chip reads **"Aturan kata kunci"**, so the method is always visible.
- **Method line:** under the "Tanggal acuan" form on the account header, one muted line.
  - "Penilaian teks: Jev (q1, jev-latest) untuk 18 dari 18 interaksi akun ini."
  - Or "Penilaian teks: aturan kata kunci. Jev belum dijalankan."
  - Or mixed: "Jev untuk 15 dari 18 interaksi; sisanya aturan kata kunci."
- **Decision-maker card "why" text:**
  - **Pick below the threshold:** status stays "belum teridentifikasi", and the why text adds the pick: "I0343 menyebut ada pemutus pengadaan; Jev menunjuk Rina Hapsari (0,62), di bawah ambang 0,80. Perlu verifikasi."
  - **Picks contradict:** "kandidat", with both names and their interaction IDs.
- **Empty:** with no judgments the UI is unchanged except the method line and the "Aturan kata kunci" chips.
- **Error:** none at render time, since there are no live calls. Script errors are terminal output (§13 US5).
- **Loading:** none added (one fast query inside the existing Suspense skeleton).

**Interaction model:**
- No new interactions.
- The chip is static text, not a button: no hover-only information, and the full sentence is in the accessible name.
- The developer flow:
  1. `npm run db:up` and migrate.
  2. Set `TYPESAFE_API_KEY`.
  3. `npx tsx scripts/judge-interactions.mts --dry-run` prints the count and an estimated token total.
  4. Run without `--dry-run`.
  5. `--report` shows the disagreements against the regexes and the gold-set precision and recall.
  6. Tune `THRESHOLDS` in `src/server/jev.ts` and re-run `check-discovery.mts`.

**Accessibility notes:**
- Chip contrast ≥ 4.5:1 on `bg-panel`. Probability is written as text ("0.97"), never as a color bar alone.
- The method line is plain text under the header, read in normal order.

## 7. Component Inventory

| Component | Type | Description | Stories |
|---|---|---|---|
| `JevChip` (inline in `evidence-graph.tsx` evidence card) | Display | "Jev 0.97 · {question label}" or "Aturan kata kunci", with an `aria-label` sentence | US2 |
| Method line (in `discovery-view.tsx` header) | Display | Which method judged this account's interactions, with counts | US2, US4 |
| Decision-maker "why" text (existing) | Display | Adds the below-threshold pick or the contradiction note | US3 |
| `scripts/judge-interactions.mts` | CLI | Batch judge with `--dry-run`, `--limit N`, `--report`, `--account P01` | US5 |
| `scripts/check-jev-rules.mts` | CLI test | Fixture judgments drive `discover()`. No network. | US6 |

## 8. Data Models

**Questions** (`src/server/jev.ts`, `QUESTIONS_VERSION = "q1"`). They're written in Indonesian because the texts are.

| Key | Type | Instructions | Options / criteria | Replaces |
|---|---|---|---|---|
| `dm_claim` | noul | "Apakah teks ini menyatakan siapa yang memegang keputusan pembelian atau pengadaan?" | true: names or describes the person or role who decides; false: no statement about who decides | `DM_CLAIM` |
| `dm_who` | choice | "Siapa yang dimaksud sebagai pemutus pembelian?" | one key per candidate contact ID, plus `tidak_disebut` | name and title matching for dm |
| `sign_claim` | noul | "Apakah teks ini menyatakan siapa yang menandatangani atau memberi persetujuan akhir?" | as above | `SIGN_CLAIM` |
| `sign_who` | choice | "Siapa yang dimaksud sebagai penandatangan atau penyetuju akhir?" | candidates plus `tidak_disebut` | name and title matching for sign |
| `technical_who` | choice | "Siapa yang dinyatakan hanya atau terutama menilai sisi teknis?" | candidates plus the sender plus `tidak_disebut` | `TECHNICAL` plus the `saya`/name test |
| `reference_request` | noul | "Apakah prospek meminta referensi pelanggan yang sudah memakai produk?" | | `REFERENCE` |

**State sent per interaction.** Candidates are the contacts with an employment row at the interaction's account covering its date, excluding the sender for `*_who` questions. Candidate titles are what let Jev resolve "GM Operations yang baru bergabung" to K017.

```typescript
// src/server/jev.ts
type JevState = {
  teks: string;               // interaction.isi
  subjek: string;
  dari: { nama: string | null; jabatan: string | null };    // sender, resolved like byEmail() today
  tanggal: string;            // YYYY-MM-DD
  kandidat: { id: string; nama: string; jabatan: string; sejak: string }[];   // e.g. K017, "GM Operations", 2026-09-01
};

type Answers = {
  dm_claim: number;                          // noul probability of yes
  dm_who: { choice: string; probabilities: Record<string, number> };
  sign_claim: number;
  sign_who: { choice: string; probabilities: Record<string, number> };
  technical_who: { choice: string; probabilities: Record<string, number> };
  reference_request: number;
};

export const THRESHOLDS = { claim: 0.8, pick: 0.6, rival: 0.2 }; // pick ≥ 0.6 and no other person > 0.2 (decided 10 Oct 2026, §14)
export type Judgments = Map<string, { answers: Answers; model: string; version: string }>; // by interaction_id
```

```prisma
// prisma/schema.prisma
model JevJudgment {
  id             String   @id @default(cuid())
  interaction_id String
  version        String   // QUESTIONS_VERSION; a new version re-judges everything
  model          String   // as reported by the API response, e.g. "jev-latest"
  answers        Json     // Answers
  state_hash     String   // sha256 of the JSON state sent; a changed hash re-judges that row
  input_tokens   Int
  output_tokens  Int
  created_at     DateTime @default(now())

  interaction Interaction @relation(fields: [interaction_id], references: [interaction_id])

  @@unique([interaction_id, version])
}
// and on model Interaction: jev JevJudgment[]
```

```typescript
// src/server/discovery.ts (extended)
export type Evidence = {
  // ...existing fields
  jev?: { question: "dm_claim" | "sign_claim" | "technical_who" | "reference_request"; p: number; model: string; version: string }; // absent = keyword rule
};
export function discover(accountId: string, asOf = SNAPSHOT, judged: Judgments = new Map()): Discovery | null;
export type Discovery = { /* ...existing */ method: { jev: number; rules: number } }; // interactions judged each way for this account
```

**Rule changes in `discover()`** (status logic unchanged, only its inputs):

| Today | With a judgment for the interaction |
|---|---|
| `DM_CLAIM.test(text)` | `answers.dm_claim >= THRESHOLDS.claim` |
| person = unique name match, else unique title match on that date | `pick = answers.dm_who`. Accept it when `pick.choice !== "tidak_disebut"`, `probabilities[pick] >= THRESHOLDS.pick`, **no other person** has `> THRESHOLDS.rival`, the contact's employment covers the date (existing `covers()`), and nobody else held that title at the account that day. `how = "name"` if `mentions(text, name)`, else `"role"`. Otherwise `person = null` and the why text records the pick and the reason (below threshold, rival, or employment history). |
| `TECHNICAL` plus the `saya`/first-name test | `technical_who` above `pick` |
| `REFERENCE.test(isi)` | `reference_request >= claim` |
| no judgment | regex path exactly as today |

Statuses follow unchanged:
- One distinct person, named → `teridentifikasi_langsung`.
- One distinct person, by role → `teridentifikasi_lintas_sumber`.
- More than one distinct person → `kandidat`.
- A claim but no person → `belum_teridentifikasi`.

## 9. API / Integration Surface

No new HTTP endpoints.

| Integration | How | Notes |
|---|---|---|
| TypeSafe API | `@typesafe-ai/sdk`, `new TypeSafeClient()` (reads `TYPESAFE_API_KEY`), `client.systemOne({ state, questions })` with all six questions per call | One call per interaction. Use the `noul` and `choice(...)` question builders. Verify exact signatures against the installed package's types, since the docs have conflicting snippets. |
| Postgres | Prisma `jevJudgment.upsert` in the script; `findMany({ where: { version: QUESTIONS_VERSION } })` in `src/server/judgments.ts` wrapped in React `cache()` | Read once per request |

**Script behavior** (`scripts/judge-interactions.mts`):
- **Selection:** interactions where `tipe !== "email_internal"`. Optionally `--account P01`.
- **Skipping:** a row is skipped when `(interaction_id, version)` exists with the same `state_hash`.
- **Calls:**
  - Concurrency 4, retrying on `APITimeoutError` and rate-limit errors with backoff.
  - A failed interaction is logged and skipped; the run continues and exits with code 1 at the end if any failed.
- **`--dry-run`:** prints the number of interactions to judge and an estimated input token count, then exits with no calls.
- **`--report`:**
  - Prints every interaction where a Jev claim decision (at the thresholds) differs from the regex.
  - Prints precision and recall for both against `scripts/jev-gold.json`.
  - Makes no API calls and reads stored rows only.
- **Missing `TYPESAFE_API_KEY`:** exits 1 with "TYPESAFE_API_KEY belum diisi di .env. Aplikasi tetap memakai aturan kata kunci." No partial writes.

**Environment:** `TYPESAFE_API_KEY` goes in `.env`, `.env.example` (empty) and `docker-compose.yml` (passed to `app`), per AGENTS.md rule 5. It's optional for the app and required only for the script.

## 10. State Management Map

| State | Location | Persistence | Notes |
|---|---|---|---|
| Judgments | Postgres `JevJudgment` | Persistent | Source of truth, versioned |
| Judgments map for a request | Server, React `cache()` in `src/server/judgments.ts` | Per request | Passed into `discover()`, which stays pure and synchronous |
| `QUESTIONS_VERSION`, `THRESHOLDS` | Code constants in `src/server/jev.ts` | In git | Changing wording bumps the version. Changing thresholds needs no re-run. |
| Gold labels | `scripts/jev-gold.json` | In git | `{ interaction_id, dm_claim: boolean, dm_who: string \| null, ... }[]`, labeled by the team |
| Method counts, Jev chips | Derived in `discover()` output | None | Rendered by existing components |

## 11. Tech Stack

The existing stack, plus one dependency.

| Layer | Choice | Rationale |
|---|---|---|
| Judgment model | TypeSafe Jev via `@typesafe-ai/sdk` | Typed noul/choice answers with probabilities, the PRD's chosen tool |
| Storage | Postgres via Prisma (existing) | Versioned, queryable, survives restarts; `data/` stays read-only input |
| Engine | `discover()` (existing) | Takes judgments as a parameter: no async ripple, testable with fixtures |
| Explanations | Gemini chat (existing) | Unchanged |

## 12. File Structure

```
prisma/
└── schema.prisma                    # + model JevJudgment, Interaction.jev
src/
├── server/
│   ├── jev.ts                       # new: QUESTIONS_VERSION, THRESHOLDS, buildState(), questions(), judge()
│   ├── judgments.ts                 # new: judgments() → Judgments, React cache(), reads Postgres
│   └── discovery.ts                 # discover(..., judged); regexes become the fallback; Evidence.jev; Discovery.method
├── app/dashboard/page.tsx           # discover(id, asOf, await judgments())
└── components/
    ├── evidence-graph.tsx           # Jev chip on evidence cards
    └── discovery-view.tsx           # method line under the header
scripts/
├── judge-interactions.mts           # new: batch judge, --dry-run, --limit, --account, --report
├── check-jev-rules.mts              # new: fixture judgments → discover() assertions, no network
└── jev-gold.json                    # new: 30 hand-labeled interactions
.env.example, docker-compose.yml     # + TYPESAFE_API_KEY
```

## 13. Acceptance Criteria

**US1: paraphrases recognized**
- [ ] Rule test with a fixture judgment on I0343 (`dm_claim 0.97`, `dm_who K017 @ 0.93`): P01's decision maker is Rina, `teridentifikasi_lintas_sumber`. The evidence includes `interactions.jsonl:343` and `contact_employment_history.csv:24`.
- [ ] Rule test with an injected paraphrase interaction on P01 ("kepala operasional yang baru masuk yang pegang keputusannya"), its fixture judgment and **no** regex match: Rina is still identified, with `how = "role"`.
- [ ] Rule test where `dm_who` picks a contact whose employment doesn't cover the interaction date: person is null and the status isn't "teridentifikasi".
- [ ] After a real run, `discover("P01")` and `discover("P04")` match AT-01 and AT-06, with `jev` set on the claim evidence.

**US2: method is visible**
- [ ] Every evidence card whose claim came from Jev shows "Jev {p} · {label}" with an `aria-label` sentence. Cards from regexes show "Aturan kata kunci".
- [ ] The method line shows "{n} dari {m} interaksi" for the open account and matches `Discovery.method`.

**US3: conservative under doubt**
- [ ] The first real answer for I0343 (Rina 0.71, "tidak disebut" 0.29, others 0) gives `teridentifikasi_lintas_sumber`. Uncertainty about *whether* someone is named is accepted.
- [ ] Rina 0.71 with Fajar 0.29 leaves `belum_teridentifikasi`, and the why text names the rival: "tetapi Fajar Nugraha juga 0,29, di atas batas pesaing 0,20".
- [ ] `dm_who` at 0.55 (below 0.60) leaves `belum_teridentifikasi`, and the why text names the pick and its probability.
- [ ] Two interactions picking different people above the threshold give `kandidat`, naming both.
- [ ] `dm_claim` below the threshold with a regex match: the Jev judgment wins (no claim). The interaction appears in `--report` as a disagreement.
- [ ] P03 stays `belum_teridentifikasi`, with Ratna as `discovery_contact` only and Hanif as `candidate` only (AT-03), with real judgments loaded.

**US4: works without Jev**
- [ ] With an empty judgments map, `discover()` output for all 45 accounts at `SNAPSHOT` deep-equals today's output, apart from `method` and the absent `jev` fields.
- [ ] With `TYPESAFE_API_KEY` unset and no rows, the dashboard renders, AT-01 to AT-06 pass, and the method line says "aturan kata kunci".
- [ ] No page request calls TypeSafe. `/api/chat` calls it only when `JEV_CHAT_CHECK=1`, once per answer, through the same ledger and cap (`@typesafe-ai/sdk` is imported only by `src/server/jev.ts`; no browser bundle contains it).

**US5: judge script**
- [ ] `--dry-run` prints "346 interaksi akan dinilai" and an estimated token count, and makes 0 API calls.
- [ ] A second full run immediately after the first makes 0 API calls and prints "0 dinilai, 346 dilewati".
- [ ] Bumping `QUESTIONS_VERSION` re-judges all 346. Editing one interaction's text in `data/` and reloading Postgres re-judges exactly 1.
- [ ] A timeout on one interaction doesn't stop the run. The process exits 1 and names the failed ID.
- [ ] `--report` prints precision and recall for regex and Jev on `jev-gold.json`, and lists the disagreements.
- [ ] A missing key exits 1 with the message in §9, and writes nothing.

**US6: offline rule tests**
- [ ] `npx tsx scripts/check-jev-rules.mts` passes with no network. `check-discovery.mts` passes before and after a real run.
- [ ] `npm run lint`, `npx tsc --noEmit` and `npm run build` pass. The migration applies cleanly with `npx prisma migrate dev --name jev_judgment`.

## 14. Open Questions & Risks

- **Usage cap (lecturer, 10 Oct 2026):** at most 100M input tokens per team. Every request is appended to `jev-usage.jsonl` (committed, shared by the team), and `judge()` refuses any request that could cross the cap. Real requests are sent only with the user's explicit permission.
- **Q:** Is there a TypeSafe account and API key, and what are the rate and usage limits? This blocks the real run but not the build, since everything else works on fixtures. _Owner: PM_
- **Q:** Who labels the 30 gold interactions? The suggestion is the 18 P01/P03 interactions plus 12 sampled from other accounts, labeled by two people with disagreements resolved. _Owner: PM / team_
- **Decided (10 Oct 2026):** the pick rule is "at least 0.6, and no other person above 0.2", not a single 0.8 cut-off. The first real run gave I0343 Rina 0.71, "tidak disebut" 0.29, everyone else 0. Jev was unsure whether the text names anyone (it describes her role, not her name), not which person, and a single cut-off can't tell that apart from two people competing. Both numbers come from this one example; confirm them with `--report` once the gold set is labeled.
- **Q:** Should the model be pinned instead of `jev-latest`, if the API offers versions? `jev-latest` can change answers between runs; the stored `model` field shows it, but doesn't prevent it. _Owner: Eng_
- **Risk:** Jev picks a plausible but wrong candidate with high probability. _Mitigation: the employment-date check stays mandatory, contradictions become `kandidat`, and thresholds come from the gold set, not defaults._
- **Risk:** Short texts (≈ 43 characters) carry little context, and probabilities may cluster near 0.5. _Mitigation: `subjek` and the sender's title are in the state, and `--report` shows the spread before thresholds are chosen._
- **Risk:** Sending text to a third party. _Mitigation: the dataset is synthetic. If real CRM text is used later, review TypeSafe's data terms first._
- **Tradeoff:** Judging ahead of time means a new note isn't judged until the script runs again. That's acceptable while notes can't be entered in the app.

## 15. Rollout & Next Steps

**MVP scope:**
- Includes: the six questions, storage, script, `discover()` integration with fallback, chip and method line, gold set, rule tests.
- Excludes: competitor mentions, evidence-strength scores, live judging, chat and Neo4j exposure.

**Phase 2+ ideas:**
- **Done (10 Oct 2026): Jev checks chat answers (FR-11).** After DeepSeek answers, one `noul` question asks whether every fact in the answer appears in the query rows the model saw. The chat shows "Diperiksa Jev (0,94)…" or, below 0.5, a written warning to check the citations. Opt-in with `JEV_CHAT_CHECK=1`; at most ~16k input tokens per question; a failed or over-cap check never blocks the answer.
- Competitor `choice` per interaction, replacing the keyword `MENYEBUT` in `load-neo4j.mts`.
- Write `dm_claim` and the other judgments onto `Interaksi` nodes so the chat can query them.
- Judge new Sales notes on save once note input exists.
- A `score` question for evidence strength to order the "Langkah berikutnya" checks.

**Sign-off needed from:**
- [ ] PM (key access, gold labels)
- [ ] Engineering lead (thresholds, model pinning)
- [ ] Design (chip and method line copy)

**Build order:**
1. Prisma model and migration; `TYPESAFE_API_KEY` in `.env.example` and `docker-compose.yml`.
2. `discover(..., judged)` with the fallback, plus `check-jev-rules.mts` on fixtures. _Fully testable without a key._
3. `src/server/judgments.ts` and the dashboard page wiring; chip and method line.
4. `src/server/jev.ts` and `judge-interactions.mts` (`--dry-run` first).
5. With a key: a real run on `--account P01`, check the report, then a full run.
6. Label the gold set, run `--report`, set `THRESHOLDS`, re-run `check-discovery.mts`.
7. Lint, typecheck, build, all check scripts, and a browser pass on P01, P03 and P04.
