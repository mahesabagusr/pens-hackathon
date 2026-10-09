import { dataset, type Row } from "./dataset";

// Decision Maker Discovery engine (PRD_DECISION_MAKER_DISCOVERY.md §9). Deterministic rules over the raw dataset;
// every conclusion carries the records it rests on.
// ponytail: claims are found with keyword rules, not Jev. Swap `claimKind` for a Jev judgment once API access exists (PRD §11).

export const SNAPSHOT = "2026-10-01";

export type Origin = "record" | "join" | "text_claim" | "cross_source_match";
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
};

export type Person = { id: string; name: string; title: string; since: string; roles: Role[]; notes: string[]; evidence: string[] };
export type Finding = { status: Status; personId: string | null; claim: string | null; why: string; evidence: string[] };
export type Step = { text: string; evidence: string[] };
export type Precedent = { id: string; date: string; kind: string; account: string; value: string; decision: string; reason: string; promise: string | null; link: string; evidence: string[] };
// "other" covers graph labels that discovery never produces itself (Tiket, Kontrak, ...), for graphs drawn from chat answers.
export type NodeKind = "account" | "person" | "deal" | "employee" | "interaction" | "decision" | "feature" | "other";
export type GraphNode = { id: string; label: string; kind: NodeKind; focus?: boolean };
export type GraphEdge = { from: string; to: string; type: string; origin: Origin; evidence: string[] };

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
};

const DM_CLAIM = /keputusan[^.]{0,60}\b(ada di|di tangan|oleh)\b|memutuskan|yang menentukan|pemutus/i;
const SIGN_CLAIM = /tanda tangan|menandatangani|persetujuan akhir/i;
const TECHNICAL = /teknis/i;
const SENIOR = /direktur|pemilik|owner|ceo|\bgm\b|general manager|\bvp\b/i;
const REFERENCE = /referensi|rekomendasi dari pengguna/i;

const covers = (h: Row, date: string) => h.mulai <= date && (!h.selesai || h.selesai >= date);
const firstName = (name: string) => name.split(" ")[0];
const mentions = (text: string, word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
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

export function discover(accountId: string, asOf = SNAPSHOT): Discovery | null {
  const d = dataset();
  const acc = d.accounts.find((a) => a.account_id === accountId);
  if (!acc) return null;

  const evidence: Evidence[] = [];
  const ev = (e: Omit<Evidence, "id">) => {
    const id = `${e.file}:${e.row}:${e.column}`;
    if (!evidence.some((x) => x.id === id)) evidence.push({ ...e, id });
    return id;
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
  const claims: { kind: "dm" | "sign"; person: Person | null; how: "name" | "role" | null; i: Row; evId: string }[] = [];
  for (const i of talks) {
    const text = i.isi;
    const iEv = () => ev({ label: `${i.tipe === "email" ? "Email" : "Meeting"} ${i.interaction_id}`, file: "interactions.jsonl", row: +i._row, column: "isi", date: i.tanggal, origin: "text_claim", excerpt: text });
    const sender = byEmail(i.dari);
    const present = String(i.peserta ?? "").split(";").map((k) => people.get(k)).filter(Boolean) as Person[];

    for (const p of new Set([...present, ...(sender ? [sender] : []), ...(i.ke ? [byEmail(i.ke)].filter(Boolean) as Person[] : [])])) {
      add(p, "discovery_contact", `Terlibat di ${i.interaction_id} (${tanggal(i.tanggal)}): ${i.subjek}`, iEv());
      node({ id: i.interaction_id, label: i.interaction_id, kind: "interaction" });
      edges.push({ from: i.interaction_id, to: p.id, type: "MELIBATKAN", origin: "record", evidence: [iEv()] });
    }
    if (TECHNICAL.test(text)) {
      for (const p of people.values()) {
        const selfClaim = sender === p && /\bsaya\b/i.test(text);
        if (selfClaim || mentions(text, firstName(p.name))) {
          add(p, "evaluator", `Menilai sisi teknis menurut ${i.interaction_id}`, iEv());
          node({ id: i.interaction_id, label: i.interaction_id, kind: "interaction" });
          edges.push({ from: i.interaction_id, to: p.id, type: "MENYEBUT", origin: "text_claim", evidence: [iEv()] });
        }
      }
    }
    for (const kind of ["dm", "sign"] as const) {
      if (!(kind === "dm" ? DM_CLAIM : SIGN_CLAIM).test(text)) continue;
      const others = [...people.values()].filter((p) => p !== sender);
      const named = others.filter((p) => mentions(text, firstName(p.name)) || mentions(text, p.name));
      // Role match must hold on the day the claim was written, not just today.
      const byRole = others.filter((p) => mentions(text, p.title) && d.history.some((h) => h.contact_id === p.id && h.account_id === acc.account_id && covers(h, i.tanggal)));
      const person = named.length === 1 ? named[0] : byRole.length === 1 ? byRole[0] : null;
      claims.push({ kind, person, how: named.length === 1 ? "name" : byRole.length === 1 ? "role" : null, i, evId: iEv() });
      node({ id: i.interaction_id, label: i.interaction_id, kind: "interaction" });
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
      add(p, kind === "dm" ? "decision_maker" : "approver", `Disebut sebagai ${what} di ${c.i.interaction_id}`, c.evId);
      edges.push({ from: c.i.interaction_id, to: p.id, type: c.how === "role" ? "MENYEBUT (peran)" : "MENYEBUT", origin: c.how === "role" ? "cross_source_match" : "text_claim", evidence: evIds });
      return c.how === "name"
        ? { status: "teridentifikasi_langsung", personId: p.id, claim: what, why: `${c.i.interaction_id} menyebut ${p.name} sebagai ${what}.`, evidence: evIds }
        : {
            status: "teridentifikasi_lintas_sumber",
            personId: p.id,
            claim: what,
            why: `${c.i.interaction_id} menyebut ${what} adalah ${p.title}. Riwayat jabatan menunjukkan satu-satunya ${p.title} di ${acc.nama} pada ${tanggal(c.i.tanggal)} adalah ${p.name} (sejak ${tanggal(p.since)}).`,
            evidence: evIds,
          };
    }
    const why = distinct.size > 1 ? `Sumber menunjuk lebih dari satu orang sebagai ${what}; perlu verifikasi.` : `${found[0].i.interaction_id} menyebut ada ${what}, tetapi peran itu tidak cocok dengan tepat satu kontak di ${acc.nama}.`;
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
    const ask = peopleList.filter((p) => p.roles.includes("discovery_contact")).sort((a, b) => b.evidence.length - a.evidence.length)[0];
    unknowns.unshift(`Siapa yang memutuskan pembelian di ${acc.nama}? Sumber sampai ${tanggal(asOf)} tidak cukup untuk memilih satu orang.`);
    if (ask) steps.push({ text: `${owner} tanyakan ke ${ask.name} (${ask.title}): siapa yang menyetujui anggaran dan menandatangani pengadaan sistem kasir?`, evidence: ask.evidence });
    for (const c of peopleList.filter((p) => p.roles.includes("candidate"))) {
      steps.push({ text: `Verifikasi peran ${c.name} (${c.title}) dalam keputusan pembelian sebelum menganggapnya pemutus.`, evidence: c.evidence });
    }
    if (!ask && !peopleList.length) steps.push({ text: `Belum ada kontak tercatat di ${acc.nama} pada tanggal ini. Mulai discovery lewat pemegang akun.`, evidence: [accEv] });
  }
  const refTalk = talks.filter((i) => REFERENCE.test(i.isi)).at(-1);
  if (refTalk) {
    steps.push({ text: `Siapkan referensi pelanggan ${acc.industri.toLowerCase()} yang sudah memakai KasirNusa; diminta di ${refTalk.interaction_id} (${tanggal(refTalk.tanggal)}).`, evidence: [ev({ label: `${refTalk.tipe === "email" ? "Email" : "Meeting"} ${refTalk.interaction_id}`, file: "interactions.jsonl", row: +refTalk._row, column: "isi", date: refTalk.tanggal, origin: "text_claim", excerpt: refTalk.isi })] });
  }
  for (const pr of precedents.filter((x) => x.promise && /belum/i.test(x.promise) && x.account !== acc.account_id)) {
    steps.push({ text: `Siapkan jawaban soal janji ${pr.id} sebelum bertemu: ${pr.promise}.`, evidence: pr.evidence });
    unknowns.push(`Apakah janji lama ${pr.id} memengaruhi sikap di ${acc.nama} belum terbukti dari data.`);
  }

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
  };
}
