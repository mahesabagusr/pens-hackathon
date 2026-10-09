import { dataset, type Row } from "./dataset";

// Decision Maker Discovery engine (PRD_DECISION_MAKER_DISCOVERY.md §9). Deterministic rules over the raw dataset;
// every conclusion carries the records it rests on.
// Claims in text come from stored Jev judgments when they exist (PRD_JEV.md), otherwise from the keyword rules below.
// Either way the status rules here decide what counts as identified; Jev only reads the text.

export const SNAPSHOT = "2026-10-01";

// "graph" marks relationships added by exploring Neo4j from Jalur bukti: real links, but with no file:row behind them.
export type Origin = "record" | "join" | "text_claim" | "cross_source_match" | "graph";
export type Status = "teridentifikasi_langsung" | "teridentifikasi_lintas_sumber" | "kandidat" | "belum_teridentifikasi";
export type Role = "decision_maker" | "approver" | "evaluator" | "champion" | "discovery_contact" | "candidate" | "senior";

export type Evidence = {
  id: string;
  label: string;
  file: string;
  row: number;
  column: string;
  date?: string;
  origin: Origin;
  excerpt?: string;
  claims?: Claim[]; // what this text was read as claiming, and by what
};
export type ClaimKind = "dm" | "sign" | "technical" | "reference";
export type Claim = { kind: ClaimKind; by: "jev" | "rules"; p?: number }; // p: Jev probability, absent for rules

// Jev answers for one interaction, stored by scripts/judge-interactions.mts (PRD_JEV.md §8).
export type Pick = { choice: string; probabilities: Record<string, number> };
export type Judgment = { dm_claim: number; dm_who: Pick; sign_claim: number; sign_who: Pick; technical_who: Pick; reference_request: number };
export type Judgments = { model: string; version: string; byInteraction: Map<string, Judgment> };
export const NONE = "tidak_disebut";
// A claim needs `claim`. A picked person needs `pick`, and no other person may get more than `rival`: Jev being
// unsure whether anyone is named at all (I0343: Rina 0.71, "tidak disebut" 0.29, others 0) is fine, two people
// competing for the role is not. The employment-date check in discover() still applies on top.
// ponytail: chosen from the first real P01 run; confirm with `judge-interactions.mts --report` on the gold set (PRD_JEV.md §14).
export const THRESHOLDS = { claim: 0.8, pick: 0.6, rival: 0.2 };

// Jev's pick of a person, and whether it is clear enough to use. Shared with the --report in judge-interactions.mts.
export function pickOf(pick: Pick) {
  if (pick.choice === NONE) return null;
  const p = pick.probabilities[pick.choice] ?? 0;
  const rival = Object.entries(pick.probabilities)
    .filter(([id]) => id !== pick.choice && id !== NONE)
    .map(([id, q]) => ({ id, p: q }))
    .sort((a, b) => b.p - a.p)[0];
  const contested = !!rival && rival.p > THRESHOLDS.rival;
  return { id: pick.choice, p, rival: contested ? rival : null, sure: p >= THRESHOLDS.pick && !contested };
}

export type Person = { id: string; name: string; title: string; since: string; roles: Role[]; notes: string[]; evidence: string[] };
export type Finding = { status: Status; personId: string | null; claim: string | null; why: string; evidence: string[] };
export type Step = { text: string; evidence: string[] };
export type Precedent = { id: string; date: string; kind: string; account: string; value: string; decision: string; reason: string; promise: string | null; link: string; evidence: string[] };
// "other" covers graph labels that discovery never produces itself (Tiket, Kontrak, ...), for graphs drawn from chat answers.
export type NodeKind = "account" | "person" | "deal" | "employee" | "interaction" | "decision" | "feature" | "other";
export type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  focus?: boolean;
  // Set only on nodes added by exploring Neo4j (src/server/neighbors.ts).
  type?: string; // Neo4j label, e.g. "Tiket"
  explored?: boolean;
  props?: Record<string, string>;
  cite?: { file: string; row: number };
};
export type GraphEdge = {
  from: string;
  to: string;
  type: string;
  origin: Origin;
  evidence: string[];
  props?: Record<string, string>; // relationship properties, explored edges only
  count?: number; // explored edges: parallel relationships collapsed into this one (MEMAKAI per month)
};

export type Discovery = {
  account: { id: string; name: string; type: string; industry: string; city: string; outlets: string };
  asOf: string;
  deal: { id: string; stage: string; value: number; status: string; owner: string } | null;
  decisionMaker: Finding;
  approver: Finding | null;
  people: Person[];
  precedents: Precedent[];
  unknowns: string[];
  steps: Step[];
  explanation: string;
  evidence: Evidence[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  // How this account's interactions were read: by Jev (model, version) or by the keyword rules.
  method: { jev: number; rules: number; model: string | null; version: string | null };
  contacts: ContactPlan;
};

// Who Sales contacts first, through whom, and what to bring (PRD_CONTACT_PLAN.md).
export type Route =
  | { kind: "direct"; note: string; evidence: string[] }
  | { kind: "intro_contact"; via: string; note: string; evidence: string[] } // via: contact id
  | { kind: "intro_staff"; via: string; note: string; evidence: string[] }; // via: employee id
export type ContactEntry = {
  personId: string;
  rank: number;
  role: string;
  why: string;
  ask: string;
  routes: Route[];
  prepare: { text: string; evidence: string[] }[];
  last: { date: string; interactionId: string; ref: string; accountId: string | null; accountName: string | null } | null;
  email: string | null;
  evidence: string[];
};
export type ContactPlan = {
  owner: string | null;
  entries: ContactEntry[];
  notYet: { personId: string; reason: string; askVia: string | null; evidence: string[] }[];
};

const DM_CLAIM = /keputusan[^.]{0,60}\b(ada di|di tangan|oleh)\b|memutuskan|yang menentukan|pemutus/i;
const SIGN_CLAIM = /tanda tangan|menandatangani|persetujuan akhir/i;
const TECHNICAL = /teknis/i;
const SENIOR = /direktur|pemilik|owner|ceo|\bgm\b|general manager|\bvp\b/i;
const REFERENCE = /referensi|rekomendasi dari pengguna/i;

// What the keyword rules read in a text, for comparing them with Jev (scripts/judge-interactions.mts --report).
export const keywordClaims = (text: string) => ({ dm: DM_CLAIM.test(text), sign: SIGN_CLAIM.test(text), reference: REFERENCE.test(text) });
export const covers = (h: Row, date: string) => h.mulai <= date && (!h.selesai || h.selesai >= date);
const firstName = (name: string) => name.split(" ")[0];
const mentions = (text: string, word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const dec = (p: number) => p.toFixed(2).replace(".", ",");
// An interaction id with what it is, so text says "email I0343" or "catatan meeting I0334", never a bare id.
const TIPE: Record<string, string> = { email: "email", email_internal: "email internal", catatan_meeting: "catatan meeting" };
export const ref = (i: Row) => `${TIPE[i.tipe] ?? "interaksi"} ${i.interaction_id}`;
const Ref = (i: Row) => ref(i).charAt(0).toUpperCase() + ref(i).slice(1);
// Several at once: "email I0051, I0066 dan I0223" when they share a type, otherwise each one labelled.
const refs = (rows: Row[]) => {
  const ids = rows.map((r) => r.interaction_id);
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} dan ${xs.at(-1)}` : xs[0]);
  return new Set(rows.map((r) => r.tipe)).size === 1 ? `${TIPE[rows[0].tipe] ?? "interaksi"} ${list(ids)}` : list(rows.map(ref));
};
export const tanggal = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function findAccount(query: string) {
  const { accounts } = dataset();
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const id = q.match(/\b([pc]\d{2})\b/)?.[1];
  if (id) return accounts.find((a) => a.account_id.toLowerCase() === id) ?? null;
  return accounts.find((a) => q.includes(a.nama.toLowerCase()) || a.nama.toLowerCase().includes(q)) ?? null;
}

export function accountOptions() {
  return dataset().accounts.map((a) => ({ id: a.account_id, name: a.nama, type: a.tipe }));
}

export function discover(accountId: string, asOf = SNAPSHOT, judged?: Judgments): Discovery | null {
  const d = dataset();
  const acc = d.accounts.find((a) => a.account_id === accountId);
  if (!acc) return null;

  const evidence: Evidence[] = [];
  const ev = (e: Omit<Evidence, "id">) => {
    const id = `${e.file}:${e.row}:${e.column}`;
    if (!evidence.some((x) => x.id === id)) evidence.push({ ...e, id });
    return id;
  };
  const mark = (evId: string, claim: Claim) => {
    const e = evidence.find((x) => x.id === evId)!;
    if (!e.claims?.some((c) => c.kind === claim.kind)) e.claims = [...(e.claims ?? []), claim];
  };
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const node = (n: GraphNode) => (nodes.has(n.id) ? nodes.get(n.id)! : (nodes.set(n.id, n), n));
  node({ id: acc.account_id, label: acc.nama, kind: "account", focus: true });
  const accEv = ev({ label: `Akun ${acc.account_id}`, file: "crm_accounts.csv", row: +acc._row, column: "nama", origin: "record", excerpt: `${acc.nama}, ${acc.industri}, ${acc.kota}` });

  const contact = (id: string) => d.contacts.find((c) => c.contact_id === id);
  const employee = (id: string) => d.employees.find((e) => e.employee_id === id);

  // People at the account on the as-of date, from dated employment history.
  const people = new Map<string, Person>();
  for (const h of d.history) {
    if (h.account_id !== acc.account_id || !covers(h, asOf)) continue;
    const c = contact(h.contact_id);
    if (!c) continue;
    const hEv = ev({ label: `${c.nama} bekerja di ${acc.account_id}`, file: "contact_employment_history.csv", row: +h._row, column: "jabatan, mulai, selesai", date: h.mulai, origin: "record", excerpt: `${h.jabatan}, sejak ${h.mulai}${h.selesai ? ` sampai ${h.selesai}` : ""}` });
    people.set(c.contact_id, { id: c.contact_id, name: c.nama, title: h.jabatan, since: h.mulai, roles: [], notes: [], evidence: [hEv] });
    node({ id: c.contact_id, label: c.nama, kind: "person" });
    edges.push({ from: c.contact_id, to: acc.account_id, type: "BEKERJA_DI", origin: "record", evidence: [hEv] });
  }
  const byEmail = (email: string) => [...people.values()].find((p) => contact(p.id)?.email === email);
  const add = (p: Person, role: Role, note: string, evId: string) => {
    if (!p.roles.includes(role)) p.roles.push(role);
    if (!p.notes.includes(note)) p.notes.push(note);
    if (!p.evidence.includes(evId)) p.evidence.push(evId);
  };

  // Deal: open deal first, otherwise the latest one.
  const deals = d.deals.filter((x) => x.account_id === acc.account_id && x.dibuat <= asOf).sort((a, b) => b.dibuat.localeCompare(a.dibuat));
  const dealRow = deals.find((x) => x.status === "Terbuka") ?? deals[0];
  let deal: Discovery["deal"] = null;
  if (dealRow) {
    const owner = employee(dealRow.owner_id);
    const dEv = ev({ label: `Deal ${dealRow.deal_id}`, file: "crm_deals.csv", row: +dealRow._row, column: "nilai_tahunan, stage, status", date: dealRow.stage_sejak, origin: "record", excerpt: `${dealRow.tipe}, ${dealRow.stage}, ${rupiah(Number(dealRow.nilai_tahunan))}/tahun, ${dealRow.status}` });
    deal = { id: dealRow.deal_id, stage: dealRow.stage, value: Number(dealRow.nilai_tahunan), status: dealRow.status, owner: owner?.nama ?? dealRow.owner_id };
    node({ id: dealRow.deal_id, label: `Deal ${dealRow.deal_id}`, kind: "deal" });
    edges.push({ from: acc.account_id, to: dealRow.deal_id, type: "MEMILIKI_DEAL", origin: "record", evidence: [dEv] });
    if (owner) {
      node({ id: owner.employee_id, label: owner.nama, kind: "employee" });
      edges.push({ from: dealRow.deal_id, to: owner.employee_id, type: "DIPEGANG_OLEH", origin: "record", evidence: [dEv] });
    }
  }

  // Read the account's external conversations up to the as-of date.
  const talks = d.interactions.filter((i) => i.account_id === acc.account_id && i.tanggal <= asOf && i.tipe !== "email_internal");
  type Found = { kind: "dm" | "sign"; person: Person | null; how: "name" | "role" | null; i: Row; evId: string; p?: number; hint?: string };
  const claims: Found[] = [];
  let byJev = 0;
  // A Jev pick that is not clear enough is kept as a hint for the "why" text.
  const picked = pickOf;
  for (const i of talks) {
    const text = i.isi;
    const j = judged?.byInteraction.get(i.interaction_id);
    if (j) byJev++;
    const iEv = () => ev({ label: Ref(i), file: "interactions.jsonl", row: +i._row, column: "isi", date: i.tanggal, origin: "text_claim", excerpt: text });
    const sender = byEmail(i.dari);
    const present = String(i.peserta ?? "").split(";").map((k) => people.get(k)).filter(Boolean) as Person[];

    for (const p of new Set([...present, ...(sender ? [sender] : []), ...(i.ke ? [byEmail(i.ke)].filter(Boolean) as Person[] : [])])) {
      add(p, "discovery_contact", `Terlibat di ${ref(i)} (${tanggal(i.tanggal)}): ${i.subjek}`, iEv());
      node({ id: i.interaction_id, label: Ref(i), kind: "interaction" });
      edges.push({ from: i.interaction_id, to: p.id, type: "MELIBATKAN", origin: "record", evidence: [iEv()] });
    }
    const evaluators = j
      ? [picked(j.technical_who)].filter((x) => x?.sure && people.has(x.id)).map((x) => ({ person: people.get(x!.id)!, p: x!.p }))
      : TECHNICAL.test(text)
        ? [...people.values()].filter((p) => (sender === p && /\bsaya\b/i.test(text)) || mentions(text, firstName(p.name))).map((person) => ({ person, p: undefined }))
        : [];
    for (const { person: p, p: prob } of evaluators) {
      const evId = iEv();
      add(p, "evaluator", `Menilai sisi teknis menurut ${ref(i)}`, evId);
      mark(evId, { kind: "technical", by: j ? "jev" : "rules", p: prob });
      node({ id: i.interaction_id, label: Ref(i), kind: "interaction" });
      edges.push({ from: i.interaction_id, to: p.id, type: "MENYEBUT", origin: "text_claim", evidence: [evId] });
    }
    for (const kind of ["dm", "sign"] as const) {
      const claimP = j ? (kind === "dm" ? j.dm_claim : j.sign_claim) : undefined;
      if (j ? claimP! < THRESHOLDS.claim : !(kind === "dm" ? DM_CLAIM : SIGN_CLAIM).test(text)) continue;
      const others = [...people.values()].filter((p) => p !== sender);
      // Worked at this account on the day the claim was written, not just on the as-of date.
      const heldOn = (p: Person) => d.history.some((h) => h.contact_id === p.id && h.account_id === acc.account_id && covers(h, i.tanggal));
      const named = (p: Person) => mentions(text, firstName(p.name)) || mentions(text, p.name);
      let person: Person | null = null;
      let how: Found["how"] = null;
      let hint: string | undefined;
      if (j) {
        const pick = picked(kind === "dm" ? j.dm_who : j.sign_who);
        const p = pick ? others.find((o) => o.id === pick.id) : undefined;
        // Same uniqueness as the keyword rule: nobody else held that title at the account that day.
        const unique = p && heldOn(p) && !others.some((o) => o !== p && o.title.toLowerCase() === p.title.toLowerCase() && heldOn(o));
        if (pick?.sure && unique) {
          person = p;
          how = named(p) ? "name" : "role";
        } else if (p) {
          const why = pick!.rival
            ? `, tetapi ${people.get(pick!.rival.id)?.name ?? pick!.rival.id} juga ${dec(pick!.rival.p)}, di atas batas pesaing ${dec(THRESHOLDS.rival)}`
            : pick!.sure
              ? ", tetapi riwayat jabatan tidak mendukung"
              : `, di bawah ambang ${dec(THRESHOLDS.pick)}`;
          hint = `Jev menunjuk ${p.name} (${dec(pick!.p)})${why}. Perlu verifikasi.`;
        }
      } else {
        const byName = others.filter(named);
        const byRole = others.filter((p) => mentions(text, p.title) && heldOn(p));
        person = byName.length === 1 ? byName[0] : byRole.length === 1 ? byRole[0] : null;
        how = byName.length === 1 ? "name" : byRole.length === 1 ? "role" : null;
      }
      const evId = iEv();
      mark(evId, { kind, by: j ? "jev" : "rules", p: claimP });
      claims.push({ kind, person, how, i, evId, p: j ? (kind === "dm" ? j.dm_who : j.sign_who).probabilities[person?.id ?? ""] : undefined, hint });
      node({ id: i.interaction_id, label: Ref(i), kind: "interaction" });
    }
  }

  const finding = (kind: "dm" | "sign"): Finding | null => {
    const found = claims.filter((c) => c.kind === kind);
    if (!found.length) return null;
    const resolved = found.filter((c) => c.person);
    const distinct = new Set(resolved.map((c) => c.person!.id));
    const what = kind === "dm" ? "pemutus pengadaan" : "penandatangan / penyetuju akhir";
    if (distinct.size === 1) {
      const c = resolved[0];
      const p = c.person!;
      const evIds = [c.evId, ...p.evidence.slice(0, 1)];
      add(p, kind === "dm" ? "decision_maker" : "approver", `Disebut sebagai ${what} di ${ref(c.i)}`, c.evId);
      edges.push({ from: c.i.interaction_id, to: p.id, type: c.how === "role" ? "MENYEBUT (peran)" : "MENYEBUT", origin: c.how === "role" ? "cross_source_match" : "text_claim", evidence: evIds });
      return c.how === "name"
        ? { status: "teridentifikasi_langsung", personId: p.id, claim: what, why: `${Ref(c.i)} menyebut ${p.name} sebagai ${what}.`, evidence: evIds }
        : {
            status: "teridentifikasi_lintas_sumber",
            personId: p.id,
            claim: what,
            why:
              c.p === undefined
                ? `${Ref(c.i)} menyebut ${what} adalah ${p.title}. Riwayat jabatan menunjukkan satu-satunya ${p.title} di ${acc.nama} pada ${tanggal(c.i.tanggal)} adalah ${p.name} (sejak ${tanggal(p.since)}).`
                : `${Ref(c.i)} menyebut ${what}; Jev mencocokkannya dengan ${p.name} (${dec(c.p)}), tanpa kandidat lain di atas ${dec(THRESHOLDS.rival)}. Riwayat jabatan menunjukkan ${p.name} satu-satunya ${p.title} di ${acc.nama} pada ${tanggal(c.i.tanggal)} (sejak ${tanggal(p.since)}).`,
            evidence: evIds,
          };
    }
    const hint = found.find((c) => c.hint)?.hint;
    const why =
      distinct.size > 1
        ? `Sumber menunjuk lebih dari satu orang sebagai ${what}; perlu verifikasi.`
        : `${Ref(found[0].i)} menyebut ada ${what}, tetapi peran itu tidak cocok dengan tepat satu kontak di ${acc.nama}.${hint ? ` ${hint}` : ""}`;
    return { status: distinct.size > 1 ? "kandidat" : "belum_teridentifikasi", personId: null, claim: what, why, evidence: found.map((c) => c.evId) };
  };

  let decisionMaker = finding("dm") ?? { status: "belum_teridentifikasi" as Status, personId: null, claim: null, why: `Tidak ada sumber sampai ${tanggal(asOf)} yang menyebut siapa memutuskan pembelian di ${acc.nama}.`, evidence: [] };
  const approver = finding("sign");

  // Senior titles become candidates only while nobody is identified; otherwise they are listed as context.
  for (const p of people.values()) {
    if (p.roles.includes("decision_maker") || p.roles.includes("approver") || !SENIOR.test(p.title)) continue;
    const identified = decisionMaker.status.startsWith("teridentifikasi");
    add(p, identified ? "senior" : "candidate", identified ? `Jabatan ${p.title}; tidak ada bukti peran dalam pengadaan ini` : `Jabatan ${p.title}; hubungan ke kewenangan pembelian belum ada bukti`, p.evidence[0]);
  }
  if (decisionMaker.status === "belum_teridentifikasi" && approver?.personId && approver.status.startsWith("teridentifikasi")) {
    decisionMaker = { ...decisionMaker, why: `${decisionMaker.why} ${people.get(approver.personId)!.name} tercatat sebagai penandatangan, yang belum tentu sama dengan pemutus.` };
  }

  // Champion: CRM field, valid only if that person still works here on the as-of date.
  const unknowns: string[] = [];
  if (acc.champion_contact_id) {
    const cEv = ev({ label: `Champion di CRM ${acc.account_id}`, file: "crm_accounts.csv", row: +acc._row, column: "champion_contact_id", origin: "record", excerpt: acc.champion_contact_id });
    const p = people.get(acc.champion_contact_id);
    if (p) add(p, "champion", "Tercatat sebagai champion di CRM", cEv);
    else {
      const gone = d.history.find((h) => h.contact_id === acc.champion_contact_id && h.account_id === acc.account_id);
      unknowns.push(`CRM masih mencatat ${contact(acc.champion_contact_id)?.nama ?? acc.champion_contact_id} sebagai champion, tetapi ${gone?.selesai ? `riwayat jabatan menunjukkan ia keluar ${tanggal(gone.selesai)}` : "ia tidak bekerja di akun ini pada tanggal acuan"}. Champion saat ini belum diketahui.`);
    }
  } else if (![...people.values()].some((p) => p.roles.includes("champion"))) {
    unknowns.push("Belum ada champion: tidak ada sumber yang menunjukkan dukungan nyata dari orang di akun ini. Hadir di meeting atau meminta referensi belum cukup.");
  }

  // Precedents: this account's decisions, plus decisions at accounts where today's people used to work.
  const precedents: Precedent[] = [];
  const precedent = (r: Row, link: string, extra: string[] = []) => {
    if (precedents.some((p) => p.id === r.decision_id)) return;
    const dEv = ev({ label: `Keputusan ${r.decision_id}`, file: "decision_log.csv", row: +r._row, column: "keputusan, alasan, status_janji", date: r.tanggal, origin: "record", excerpt: `${r.tipe} ${r.nilai}: ${r.keputusan}. ${r.alasan}` });
    const feature = r.fitur_dijanjikan ? d.features.find((f) => f.feature_id === r.fitur_dijanjikan) : undefined;
    const ids = [dEv, ...extra];
    node({ id: r.decision_id, label: r.decision_id, kind: "decision" });
    if (feature) {
      const fEv = ev({ label: `Fitur ${feature.feature_id}`, file: "features.csv", row: +feature._row, column: "status, target_terkini", origin: "record", excerpt: `${feature.nama}: ${feature.status}, target ${feature.target_awal} menjadi ${feature.target_terkini}` });
      ids.push(fEv);
      node({ id: feature.feature_id, label: feature.nama, kind: "feature" });
      edges.push({ from: r.decision_id, to: feature.feature_id, type: "MENJANJIKAN", origin: "record", evidence: [dEv, fEv] });
    }
    precedents.push({
      id: r.decision_id,
      date: r.tanggal,
      kind: r.tipe,
      account: r.account_id,
      value: r.nilai,
      decision: r.keputusan,
      reason: r.alasan,
      promise: feature ? `${feature.nama}: ${r.status_janji || "status tidak dicatat"}; roadmap ${feature.status.toLowerCase()}, target ${feature.target_awal} menjadi ${feature.target_terkini.toLowerCase()}` : null,
      link,
      evidence: ids,
    });
  };
  for (const r of d.decisions) if (r.account_id === acc.account_id && r.tanggal <= asOf) {
    precedent(r, `Keputusan untuk ${acc.nama} sendiri.`);
    edges.push({ from: r.decision_id, to: acc.account_id, type: "TENTANG", origin: "record", evidence: precedents.at(-1)!.evidence.slice(0, 1) });
  }
  for (const p of people.values()) {
    for (const h of d.history) {
      if (h.contact_id !== p.id || !h.account_id || h.account_id === acc.account_id || h.mulai > asOf) continue;
      const prev = d.accounts.find((a) => a.account_id === h.account_id);
      const related = d.decisions.filter((r) => r.account_id === h.account_id && r.tanggal >= h.mulai && (!h.selesai || r.tanggal <= h.selesai) && r.tanggal <= asOf);
      if (!prev || !related.length) continue;
      const hEv = ev({ label: `${p.name} pernah di ${prev.account_id}`, file: "contact_employment_history.csv", row: +h._row, column: "account_id, mulai, selesai", date: h.mulai, origin: "join", excerpt: `${h.jabatan} di ${prev.nama}, ${h.mulai} sampai ${h.selesai || "sekarang"}` });
      node({ id: prev.account_id, label: prev.nama, kind: "account" });
      edges.push({ from: p.id, to: prev.account_id, type: "PERNAH_BEKERJA_DI", origin: "record", evidence: [hEv] });
      for (const r of related) {
        precedent(r, `${p.name} bekerja di ${prev.nama} (${h.jabatan}) saat keputusan ini dibuat. Dampaknya pada ${acc.nama} belum terbukti.`, [hEv]);
        edges.push({ from: r.decision_id, to: prev.account_id, type: "TENTANG", origin: "record", evidence: precedents.at(-1)!.evidence.slice(0, 1) });
      }
    }
  }

  // Unknowns and next steps follow from what is and is not established.
  const peopleList = [...people.values()];
  const latest = (p: Person) => p.evidence.map((id) => evidence.find((e) => e.id === id)?.date ?? "").sort().at(-1) ?? "";
  // Who to ask first when nobody is identified: the contact KasirNusa spoke with most recently, then most often.
  const talkers = peopleList
    .filter((p) => p.roles.includes("discovery_contact"))
    .sort((a, b) => latest(b).localeCompare(latest(a)) || b.evidence.length - a.evidence.length);
  const dm = decisionMaker.personId ? people.get(decisionMaker.personId)! : null;
  const owner = deal?.owner ?? "Sales";
  const steps: Step[] = [];
  if (dm) {
    const claim = claims.find((c) => c.kind === "dm" && c.person === dm)!;
    const via = byEmail(claim.i.dari);
    const metDm = talks.some((i) => String(i.peserta).includes(dm.id) || byEmail(i.dari) === dm || byEmail(i.ke) === dm);
    if (!metDm && via) steps.push({ text: `${owner} minta ${via.name} (${via.title}) memperkenalkan ke ${dm.name}, karena ${via.name} sudah meneruskan proposal kepadanya.`, evidence: [claim.evId] });
    steps.push({ text: `Konfirmasi langsung ke ${dm.name}: kriteria keputusan, jadwal pengadaan, dan siapa yang menandatangani kontrak.`, evidence: decisionMaker.evidence });
    if (!approver) unknowns.push(`Pemegang anggaran dan penandatangan kontrak belum diketahui; belum tentu ${dm.name}.`);
  } else {
    const ask = talkers[0];
    unknowns.unshift(`Siapa yang memutuskan pembelian di ${acc.nama}? Sumber sampai ${tanggal(asOf)} tidak cukup untuk memilih satu orang.`);
    if (ask) steps.push({ text: `${owner} tanyakan ke ${ask.name} (${ask.title}): siapa yang menyetujui anggaran dan menandatangani pengadaan sistem kasir?`, evidence: ask.evidence });
    for (const c of peopleList.filter((p) => p.roles.includes("candidate"))) {
      steps.push({ text: `Verifikasi peran ${c.name} (${c.title}) dalam keputusan pembelian sebelum menganggapnya pemutus.`, evidence: c.evidence });
    }
    if (!ask && !peopleList.length) steps.push({ text: `Belum ada kontak tercatat di ${acc.nama} pada tanggal ini. Mulai discovery lewat pemegang akun.`, evidence: [accEv] });
  }
  const asksReference = (i: Row) => {
    const j = judged?.byInteraction.get(i.interaction_id);
    return j ? j.reference_request >= THRESHOLDS.claim : REFERENCE.test(i.isi);
  };
  const refTalk = talks.filter(asksReference).at(-1);
  if (refTalk) {
    const refEv = ev({ label: Ref(refTalk), file: "interactions.jsonl", row: +refTalk._row, column: "isi", date: refTalk.tanggal, origin: "text_claim", excerpt: refTalk.isi });
    const j = judged?.byInteraction.get(refTalk.interaction_id);
    mark(refEv, { kind: "reference", by: j ? "jev" : "rules", p: j?.reference_request });
    steps.push({ text: `Siapkan referensi pelanggan ${acc.industri.toLowerCase()} yang sudah memakai KasirNusa; diminta di ${ref(refTalk)} (${tanggal(refTalk.tanggal)}).`, evidence: [refEv] });
  }
  for (const pr of precedents.filter((x) => x.promise && /belum/i.test(x.promise) && x.account !== acc.account_id)) {
    steps.push({ text: `Siapkan jawaban soal janji ${pr.id} sebelum bertemu: ${pr.promise}.`, evidence: pr.evidence });
    unknowns.push(`Apakah janji lama ${pr.id} memengaruhi sikap di ${acc.nama} belum terbukti dari data.`);
  }

  // ---- Contact plan (PRD_CONTACT_PLAN.md §8): built only from the findings above, so it can't disagree with them.
  const contactPlan = (): ContactPlan => {
    const identified = (f: Finding | null) => !!f?.personId && f.status.startsWith("teridentifikasi");
    const local = (email: string) => email.split("@")[0].toLowerCase();
    const talkEv = (i: Row) => ev({ label: Ref(i), file: "interactions.jsonl", row: +i._row, column: "isi", date: i.tanggal, origin: "text_claim", excerpt: i.isi });
    // Everything a person took part in before asOf, at any account: by meeting id, current email, or an older
    // address with the same name part at an account they worked at (the graph loader's "email lama" rule).
    const involved = (p: Person) => {
      const c = contact(p.id)!;
      const worked = new Set(d.history.filter((h) => h.contact_id === p.id && h.account_id).map((h) => h.account_id));
      return d.interactions.filter(
        (i) =>
          i.tanggal <= asOf &&
          (String(i.peserta ?? "").split(";").includes(p.id) ||
            [i.dari, i.ke].some((e) => !!e && (e === c.email || (worked.has(i.account_id) && !e.endsWith("@kasirnusa.id") && local(e) === local(c.email))))),
      );
    };
    const staffIn = (i: Row) =>
      d.employees.filter((e) => e.email === i.dari || e.email === i.ke || String(i.peserta ?? "").split(";").includes(e.employee_id));

    const routes = (p: Person, claim?: (typeof claims)[number]): Route[] => {
      const all = involved(p);
      const here = all.filter((i) => i.account_id === acc.account_id);
      if (here.length) {
        const lastHere = here.at(-1)!;
        return [{ kind: "direct", note: `Langsung: sudah berbicara dengan KasirNusa di akun ini, terakhir ${ref(lastHere)} (${tanggal(lastHere.tanggal)}).`, evidence: [talkEv(lastHere)] }];
      }
      const out: Route[] = [];
      const sender = claim ? byEmail(claim.i.dari) : undefined;
      if (claim && sender && sender !== p && involved(sender).some((i) => i.account_id === acc.account_id)) {
        out.push({
          kind: "intro_contact",
          via: sender.id,
          note: `Lewat ${sender.name} (${sender.title}): ia yang menyebutnya di ${ref(claim.i)} dan sudah berbicara dengan KasirNusa.`,
          evidence: [claim.evId],
        });
      }
      // KasirNusa staff who already spoke with this person at another account.
      const elsewhere = all.filter((i) => i.account_id && i.account_id !== acc.account_id);
      const byStaff = new Map<string, Row[]>();
      for (const i of elsewhere) for (const e of staffIn(i)) byStaff.set(e.employee_id, [...(byStaff.get(e.employee_id) ?? []), i]);
      const [staffId, staffTalks] = [...byStaff.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
      if (staffId && staffTalks) {
        const where = d.accounts.find((a) => a.account_id === staffTalks[0].account_id)?.nama ?? staffTalks[0].account_id;
        const [a, z] = [staffTalks[0], staffTalks.at(-1)!];
        out.push({
          kind: "intro_staff",
          via: staffId,
          note: `Lewat ${employee(staffId)!.nama} (KasirNusa): sudah berhubungan dengannya di ${where}, ${staffTalks.length} percakapan dari ${ref(a)} (${tanggal(a.tanggal)}) sampai ${ref(z)} (${tanggal(z.tanggal)}).`,
          evidence: staffTalks.map(talkEv),
        });
      }
      return out.slice(0, 2);
    };

    let refShown = false;
    const prepare = (p: Person, claim?: (typeof claims)[number]) => {
      const items: { text: string; evidence: string[] }[] = [];
      for (const pr of precedents) {
        if (!pr.promise || !/belum/i.test(pr.promise) || pr.account === acc.account_id) continue;
        const job = d.history.find((h) => h.contact_id === p.id && h.account_id === pr.account && h.mulai <= pr.date && (!h.selesai || h.selesai >= pr.date));
        if (!job) continue;
        // Interactions with this person about the promised feature, matched on the words of its name ("integrasi", "accurate").
        const feature = d.features.find((f) => f.feature_id === d.decisions.find((r) => r.decision_id === pr.id)?.fitur_dijanjikan);
        const words = (feature?.nama.toLowerCase().match(/[a-z]{6,}/g) ?? []);
        const there = involved(p).filter((i) => i.account_id === pr.account && words.some((w) => i.isi.toLowerCase().includes(w)));
        const where = d.accounts.find((a) => a.account_id === pr.account)?.nama ?? pr.account;
        items.push({
          text: `Janji ${pr.id}: ${pr.promise}. Ia bekerja di ${where} saat janji ini dibuat${there.length ? ` dan membahas fitur ini langsung dengan KasirNusa (${refs(there)})` : ""}.`,
          evidence: [...pr.evidence, ...there.map(talkEv)],
        });
      }
      if (refTalk && !refShown && (involved(p).includes(refTalk) || claim?.i === refTalk)) {
        refShown = true;
        items.push({ text: `Referensi pelanggan ${acc.industri.toLowerCase()} yang sudah memakai KasirNusa, diminta di ${ref(refTalk)} (${tanggal(refTalk.tanggal)}).`, evidence: [talkEv(refTalk)] });
      }
      return items;
    };

    const entries: ContactEntry[] = [];
    const put = (p: Person | null | undefined, role: string, why: string, whyEv: string[], ask: string, claim?: (typeof claims)[number]) => {
      if (!p || entries.length >= 3 || entries.some((e) => e.personId === p.id)) return;
      const r = routes(p, claim);
      const prep = prepare(p, claim);
      const last = involved(p).at(-1);
      entries.push({
        personId: p.id,
        rank: entries.length + 1,
        role,
        why,
        ask,
        routes: r,
        prepare: prep,
        last: last ? { date: last.tanggal, interactionId: last.interaction_id, ref: ref(last), accountId: last.account_id || null, accountName: d.accounts.find((a) => a.account_id === last.account_id)?.nama ?? null } : null,
        email: contact(p.id)?.email ?? null,
        evidence: [...new Set([...whyEv, ...r.flatMap((x) => x.evidence), ...prep.flatMap((x) => x.evidence), ...(last ? [talkEv(last)] : [])])],
      });
    };
    const statusText = (s: Status) => (s === "teridentifikasi_langsung" ? "langsung" : "lintas sumber");
    const claimFor = (kind: "dm" | "sign", p: Person | null) => claims.find((c) => c.kind === kind && c.person === p);

    if (identified(decisionMaker)) {
      const p = people.get(decisionMaker.personId!)!;
      put(p, `Pemutus pengadaan · ${statusText(decisionMaker.status)}`, decisionMaker.why, decisionMaker.evidence, "Kriteria keputusan, jadwal pengadaan, dan siapa yang menandatangani kontrak.", claimFor("dm", p));
    }
    if (approver && identified(approver)) {
      const p = people.get(approver.personId!)!;
      put(p, `Penandatangan · ${statusText(approver.status)}`, approver.why, approver.evidence, "Anggaran dan proses tanda tangan; siapa lagi yang ikut memutuskan.", claimFor("sign", p));
    }
    if (!identified(decisionMaker)) {
      const top = talkers[0];
      if (top)
        put(
          top,
          "Kontak discovery",
          talkers.length === 1 ? `Satu-satunya kontak di ${acc.nama} yang sudah berbicara dengan KasirNusa.` : `Kontak di ${acc.nama} yang terakhir berbicara dengan KasirNusa (${tanggal(latest(top))}).`,
          top.evidence,
          "Siapa yang menyetujui anggaran dan menandatangani pengadaan sistem kasir?",
        );
    }
    for (const p of peopleList.filter((x) => x.roles.includes("champion")))
      put(p, "Champion", "Tercatat sebagai champion di CRM dan masih bekerja di akun ini.", p.evidence, "Dukungan internal: siapa yang perlu diyakinkan dan apa keberatannya.");
    for (const p of peopleList.filter((x) => x.roles.includes("evaluator")))
      put(p, "Penilai teknis", p.notes.find((n) => /teknis/i.test(n)) ?? "Menilai sisi teknis.", p.evidence, "Kebutuhan teknis yang harus dipenuhi; jaga dukungannya selama evaluasi.");

    const first = entries[0] ? people.get(entries[0].personId)! : null;
    const notYet = peopleList
      .filter((p) => !entries.some((e) => e.personId === p.id) && (p.roles.includes("candidate") || p.roles.includes("senior")))
      .map((p) => ({
        personId: p.id,
        reason: `${p.roles.includes("senior") ? "Jabatan senior tanpa bukti peran dalam pengadaan ini" : `Jabatan ${p.title}; perannya dalam keputusan belum ada bukti`}${first ? `; tanyakan ke ${first.name} dulu` : ""}.`,
        askVia: first?.id ?? null,
        evidence: p.evidence,
      }));
    return { owner: deal?.owner ?? employee(acc.account_owner_id)?.nama ?? null, entries, notYet };
  };
  const contacts = contactPlan();

  const order: Role[] = ["decision_maker", "approver", "champion", "evaluator", "candidate", "discovery_contact", "senior"];
  const rank = (p: Person) => Math.min(...p.roles.map((r) => order.indexOf(r)).concat(order.length));
  const label: Record<Status, string> = {
    teridentifikasi_langsung: "teridentifikasi langsung",
    teridentifikasi_lintas_sumber: "teridentifikasi lintas sumber",
    kandidat: "masih kandidat",
    belum_teridentifikasi: "belum teridentifikasi",
  };
  const explanation = dm
    ? `Status: ${label[decisionMaker.status]}. Pemutus pengadaan di ${acc.nama} adalah ${dm.name} (${dm.title}). ${decisionMaker.why}`
    : `Status: ${label[decisionMaker.status]}. ${decisionMaker.why}${peopleList.some((p) => p.roles.includes("candidate")) ? ` Kandidat yang perlu diverifikasi: ${peopleList.filter((p) => p.roles.includes("candidate")).map((p) => `${p.name} (${p.title})`).join(", ")}.` : ""}`;

  return {
    account: { id: acc.account_id, name: acc.nama, type: acc.tipe, industry: acc.industri, city: acc.kota, outlets: acc.jumlah_outlet },
    asOf,
    deal,
    decisionMaker,
    approver,
    people: peopleList.sort((a, b) => rank(a) - rank(b)),
    precedents,
    unknowns,
    steps,
    explanation,
    evidence,
    graph: { nodes: [...nodes.values()], edges: edges.filter((e, i) => edges.findIndex((x) => x.from === e.from && x.to === e.to && x.type === e.type) === i) },
    method: { jev: byJev, rules: talks.length - byJev, model: byJev ? judged!.model : null, version: byJev ? judged!.version : null },
    contacts,
  };
}
