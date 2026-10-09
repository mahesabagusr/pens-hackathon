import { db } from "./db";
import { graph } from "./graph";

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function graphCounts() {
  const [decisions, accounts, contacts, interactions, tickets, rels] = await Promise.all([
    db.decision.count(),
    db.account.count(),
    db.contact.count(),
    db.interaction.count(),
    db.supportTicket.count(),
    graph().executeQuery("MATCH ()-[r]->() RETURN count(r) AS n"),
  ]);
  return {
    decisions,
    accounts,
    contacts,
    interactions,
    tickets,
    relationships: rels.records[0].get("n") as number,
  };
}

export type Entry = Awaited<ReturnType<typeof dictionaryEntries>>[number];

export async function dictionaryEntries() {
  const rows = await db.decision.findMany({
    orderBy: { tanggal: "desc" },
    include: { account: true, requester: true, decider: true, feature: true },
  });
  return rows.map((d) => ({
    id: d.decision_id,
    tanggal: day(d.tanggal),
    tipe: d.tipe,
    headword:
      d.tipe === "diskon" ? `Diskon ${d.nilai}` : d.tipe === "janji_fitur" ? `Janji ${d.feature?.nama}` : (d.nilai ?? d.tipe),
    keputusan: d.keputusan,
    alasan: d.alasan,
    akun: `${d.account.nama} (${d.account_id})`,
    diminta: d.requester.nama,
    diputuskan: `${d.decider.nama}, ${d.decider.jabatan}`,
    statusJanji: d.status_janji,
  }));
}

// The decision the trace section walks through. Chosen because it has every link type.
export async function traceOf(id: string) {
  const d = await db.decision.findUnique({
    where: { decision_id: id },
    include: {
      account: true,
      deal: true,
      evidence: true,
      feature: true,
      requester: true,
      decider: true,
    },
  });
  if (!d || !d.deal || !d.evidence || !d.feature) return null;
  const followUp = await db.decision.findFirst({
    where: { account_id: d.account_id, fitur_dijanjikan: null, tanggal: { gt: d.tanggal }, decision_id: { not: id } },
    orderBy: { tanggal: "asc" },
  });
  return {
    id: d.decision_id,
    tanggal: day(d.tanggal),
    keputusan: d.keputusan,
    nilai: d.nilai,
    alasan: d.alasan,
    diminta: `${d.requester.nama}, ${d.requester.jabatan}`,
    diputuskan: `${d.decider.nama}, ${d.decider.jabatan}`,
    akun: { id: d.account.account_id, nama: d.account.nama, paket: d.account.paket, outlet: d.account.jumlah_outlet },
    deal: { id: d.deal.deal_id, tipe: d.deal.tipe, status: d.deal.status, nilai: d.deal.nilai_tahunan },
    bukti: { id: d.evidence.interaction_id, tanggal: day(d.evidence.tanggal), dari: d.evidence.dari, subjek: d.evidence.subjek },
    fitur: {
      id: d.feature.feature_id,
      nama: d.feature.nama,
      status: d.feature.status,
      targetAwal: d.feature.target_awal,
      targetKini: d.feature.target_terkini,
      janji: d.status_janji,
    },
    lanjutan: followUp && {
      id: followUp.decision_id,
      tanggal: day(followUp.tanggal),
      tipe: followUp.tipe,
      keputusan: followUp.keputusan,
      nilai: followUp.nilai,
      alasan: followUp.alasan,
    },
  };
}
