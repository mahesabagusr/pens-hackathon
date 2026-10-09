import { createHash } from "node:crypto";
import { cache } from "react";
import { dataset, type Row } from "./dataset";
import { db } from "./db";
import { covers, type Judgment, type Judgments } from "./discovery";

// Stored Jev judgments for discover() (PRD_JEV.md §8, §10). No TypeSafe SDK here: pages read judgments, only
// scripts/judge-interactions.mts (through ./jev) asks Jev for new ones.

// Bump when a question's wording or options change: every interaction is judged again under the new version.
export const QUESTIONS_VERSION = "q1";

// What Jev is shown for one interaction. The candidates are the only people it may pick: contacts who worked
// at the account on the day the text was written, with that day's title.
export function stateOf(i: Row) {
  const d = dataset();
  const contact = d.contacts.find((c) => c.email === i.dari);
  const employee = d.employees.find((e) => e.email === i.dari);
  const jobs = d.history.filter((h) => h.account_id === i.account_id && covers(h, i.tanggal));
  return {
    state: {
      subjek: i.subjek,
      teks: i.isi,
      tanggal: i.tanggal,
      dari: {
        nama: contact?.nama ?? employee?.nama ?? i.dari,
        jabatan: contact
          ? (jobs.find((h) => h.contact_id === contact.contact_id)?.jabatan ?? contact.jabatan_saat_ini)
          : employee
            ? `${employee.jabatan}, KasirNusa`
            : null,
      },
    },
    candidates: jobs.flatMap((h) => {
      const c = d.contacts.find((x) => x.contact_id === h.contact_id);
      return c ? [{ id: c.contact_id, description: `${c.nama}, ${h.jabatan} sejak ${h.mulai}` }] : [];
    }),
  };
}

// Same state and version as when judged, or the judgment no longer describes this text.
export const hashOf = (s: ReturnType<typeof stateOf>) => createHash("sha256").update(JSON.stringify({ v: QUESTIONS_VERSION, ...s })).digest("hex");

// Judgments still valid for today's data. Undefined when there are none, or when Postgres can't be read:
// discover() then uses its keyword rules, so a database problem never breaks the dashboard.
export const judgments = cache(async (): Promise<Judgments | undefined> => {
  try {
    const rows = await db.jevJudgment.findMany({
      where: { version: QUESTIONS_VERSION },
      select: { interaction_id: true, answers: true, model: true, state_hash: true },
      orderBy: { created_at: "desc" },
    });
    const byId = new Map(dataset().interactions.map((i) => [i.interaction_id, i]));
    const valid = rows.filter((r) => {
      const i = byId.get(r.interaction_id);
      return i && hashOf(stateOf(i)) === r.state_hash;
    });
    if (!valid.length) return undefined;
    return {
      model: valid[0].model,
      version: QUESTIONS_VERSION,
      byInteraction: new Map(valid.map((r) => [r.interaction_id, r.answers as Judgment])),
    };
  } catch (err) {
    console.error("jev judgments unavailable, using keyword rules", err);
    return undefined;
  }
});
