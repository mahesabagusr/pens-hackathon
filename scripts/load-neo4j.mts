import "dotenv/config";
import neo4j from "neo4j-driver";
import { db } from "../src/server/db";
import { graph } from "../src/server/graph";

type Row = Record<string, unknown>;

const driver = graph();
const session = driver.session();

// Neo4j can't take JS Dates, and JS numbers would be stored as floats.
const plain = (o: Row): Row =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [
      k,
      v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "number" && Number.isInteger(v) ? neo4j.int(v) : v,
    ]),
  );

const run = async (cypher: string, rows: Row[] = [{}]) => {
  for (let i = 0; i < rows.length; i += 2000)
    await session.run(cypher, { rows: rows.slice(i, i + 2000).map(plain) });
};

const node = (label: string, rows: Row[], idKey: string) =>
  run(`UNWIND $rows AS r CREATE (n:${label}) SET n = r`, rows.map((r) => ({ ...r, id: r[idKey] })));

const lokal = (email: string | null) => (email && !email.endsWith("@kasirnusa.id") ? email.split("@")[0] : null);

const [employees, releases, features, accounts, contacts, history, deals, outlets, bugs, interactions, decisions, contracts, tickets, featureUsage, usage] =
  await Promise.all([
    db.employee.findMany(),
    db.release.findMany(),
    db.feature.findMany(),
    db.account.findMany(),
    db.contact.findMany(),
    db.employmentHistory.findMany(),
    db.deal.findMany(),
    db.outlet.findMany(),
    db.bug.findMany(),
    db.interaction.findMany(),
    db.decision.findMany(),
    db.contract.findMany(),
    db.supportTicket.findMany(),
    db.featureUsageMonthly.findMany(),
    // 226k daily rows stay in Postgres; the graph only gets per-outlet totals.
    db.productUsageDaily.groupBy({
      by: ["outlet_id"],
      _sum: { jumlah_transaksi: true, transaksi_offline_tersinkron: true },
      _max: { versi_aplikasi: true },
    }),
  ]);
const usageByOutlet = new Map(usage.map((u) => [u.outlet_id, u]));

await run("MATCH (n) DETACH DELETE n");
for (const l of ["Akun", "Kontak", "Karyawan", "Outlet", "Deal", "Kontrak", "Interaksi", "Tiket", "Bug", "Rilis", "Fitur", "Keputusan", "Kompetitor", "Organisasi"])
  await run(`CREATE CONSTRAINT IF NOT EXISTS FOR (n:${l}) REQUIRE n.id IS UNIQUE`);

// ---- nodes
await node("Karyawan", employees, "employee_id");
await node("Rilis", releases, "versi");
await node("Fitur", features, "feature_id");
await node("Akun", accounts, "account_id");
await node("Kontak", contacts.map((c) => ({ ...c, lokal: lokal(c.email) })), "contact_id");
const orgs = [...new Set(history.filter((h) => !h.account_id).map((h) => h.organisasi))];
await node("Organisasi", orgs.map((nama) => ({ nama })), "nama");
await node("Kompetitor", [...new Set(deals.map((d) => d.kompetitor).filter(Boolean))].map((nama) => ({ nama })), "nama");
await node(
  "Outlet",
  outlets.map((o) => {
    const u = usageByOutlet.get(o.outlet_id);
    return {
      ...o,
      transaksi_total: u?._sum.jumlah_transaksi,
      transaksi_offline_tersinkron_total: u?._sum.transaksi_offline_tersinkron,
      versi_terakhir: u?._max.versi_aplikasi,
    };
  }),
  "outlet_id",
);
await node("Deal", deals, "deal_id");
await node("Kontrak", contracts, "contract_id");
await node("Bug", bugs, "bug_id");
await node("Tiket", tickets, "ticket_id");
await node(
  "Interaksi",
  interactions.map((i) => ({ ...i, dari_lokal: lokal(i.dari), ke_lokal: lokal(i.ke) })),
  "interaction_id",
);
await node("Keputusan", decisions, "decision_id");

// ---- relationships
await run("UNWIND $rows AS r MATCH (a:Akun {id:r.account_id}), (e:Karyawan {id:r.account_owner_id}) CREATE (a)-[:DIPEGANG_OLEH]->(e)", accounts);
await run(
  "UNWIND $rows AS r MATCH (k:Kontak {id:r.champion_contact_id}), (a:Akun {id:r.account_id}) CREATE (k)-[:CHAMPION_DARI]->(a)",
  accounts.filter((a) => a.champion_contact_id),
);

for (const [rel, ended] of [["BEKERJA_DI", false], ["PERNAH_BEKERJA_DI", true]] as const)
  for (const label of ["Akun", "Organisasi"] as const)
    await run(
      `UNWIND $rows AS r MATCH (k:Kontak {id:r.contact_id}), (o:${label} {id:r.target})
       CREATE (k)-[:${rel} {jabatan:r.jabatan, mulai:r.mulai, selesai:r.selesai}]->(o)`,
      history
        .filter((h) => !!h.selesai === ended && (label === "Akun" ? h.account_id : !h.account_id))
        .map((h) => ({ ...h, target: h.account_id ?? h.organisasi })),
    );

// Contacts who overlapped at the same organisation know each other. Stored one way (id order); query it undirected.
await run(`
  MATCH (a:Kontak)-[r1:BEKERJA_DI|PERNAH_BEKERJA_DI]->(o)<-[r2:BEKERJA_DI|PERNAH_BEKERJA_DI]-(b:Kontak)
  WHERE a.id < b.id AND r1.mulai <= coalesce(r2.selesai, '9999-12-31') AND r2.mulai <= coalesce(r1.selesai, '9999-12-31')
  WITH a, b, collect(DISTINCT o.nama) AS tempat
  CREATE (a)-[:SALING_KENAL {tempat: tempat}]->(b)`);

await run("UNWIND $rows AS r MATCH (a:Akun {id:r.account_id}), (o:Outlet {id:r.outlet_id}) CREATE (a)-[:MEMILIKI]->(o)", outlets);
await run("UNWIND $rows AS r MATCH (a:Akun {id:r.account_id}), (d:Deal {id:r.deal_id}) CREATE (a)-[:MEMILIKI]->(d)", deals);
await run("UNWIND $rows AS r MATCH (d:Deal {id:r.deal_id}), (e:Karyawan {id:r.owner_id}) CREATE (d)-[:DIPEGANG_OLEH]->(e)", deals);
await run(
  "UNWIND $rows AS r MATCH (d:Deal {id:r.deal_id}), (c:Kompetitor {id:r.kompetitor}) CREATE (d)-[:BERSAING_DENGAN]->(c)",
  deals.filter((d) => d.kompetitor),
);
await run("UNWIND $rows AS r MATCH (a:Akun {id:r.account_id}), (k:Kontrak {id:r.contract_id}) CREATE (a)-[:MEMILIKI]->(k)", contracts);

await run("UNWIND $rows AS r MATCH (b:Bug {id:r.bug_id}), (v:Rilis {id:r.versi_terdampak}) CREATE (b)-[:DI_VERSI]->(v)", bugs);
await run("UNWIND $rows AS r MATCH (b:Bug {id:r.bug_id}), (f:Fitur {id:r.fitur_terkait}) CREATE (b)-[:TERKAIT_FITUR]->(f)", bugs);

// A ticket hangs off its outlet; the few without an outlet hang off the account.
await run(
  "UNWIND $rows AS r MATCH (o:Outlet {id:r.outlet_id}), (t:Tiket {id:r.ticket_id}) CREATE (o)-[:MEMBUKA_TIKET]->(t)",
  tickets.filter((t) => t.outlet_id),
);
await run(
  "UNWIND $rows AS r MATCH (a:Akun {id:r.account_id}), (t:Tiket {id:r.ticket_id}) CREATE (a)-[:MEMBUKA_TIKET]->(t)",
  tickets.filter((t) => !t.outlet_id),
);
await run(
  "UNWIND $rows AS r MATCH (k:Kontak {id:r.pelapor_contact_id}), (t:Tiket {id:r.ticket_id}) CREATE (k)-[:MELAPORKAN]->(t)",
  tickets.filter((t) => t.pelapor_contact_id),
);
await run(
  "UNWIND $rows AS r MATCH (t:Tiket {id:r.ticket_id}), (b:Bug {id:r.bug_id}) CREATE (t)-[:DISEBABKAN_OLEH]->(b)",
  tickets.filter((t) => t.bug_id),
);

await run(
  "UNWIND $rows AS r MATCH (i:Interaksi {id:r.interaction_id}), (a:Akun {id:r.account_id}) CREATE (i)-[:TENTANG]->(a)",
  interactions.filter((i) => i.account_id),
);
await run(
  "UNWIND $rows AS r MATCH (i:Interaksi {id:r.interaction_id}), (j:Interaksi {id:r.membalas_id}) CREATE (i)-[:MEMBALAS]->(j)",
  interactions.filter((i) => i.membalas_id),
);

// Who took part: meeting attendees by id, emails by exact address.
const attendees = interactions.flatMap((i) => i.peserta.map((p) => ({ interaction_id: i.interaction_id, who: p })));
const emails = interactions.flatMap((i) => [
  { interaction_id: i.interaction_id, email: i.dari, peran: "pengirim" },
  ...(i.ke ? [{ interaction_id: i.interaction_id, email: i.ke, peran: "penerima" }] : []),
]);
for (const [label, prefix] of [["Kontak", "K"], ["Karyawan", "E"]] as const) {
  await run(
    `UNWIND $rows AS r MATCH (p:${label} {id:r.who}), (i:Interaksi {id:r.interaction_id}) MERGE (p)-[t:TERLIBAT_DI]->(i) SET t.peran = 'peserta'`,
    attendees.filter((a) => a.who.startsWith(prefix)),
  );
  await run(
    `UNWIND $rows AS r MATCH (p:${label} {email:r.email}), (i:Interaksi {id:r.interaction_id}) MERGE (p)-[t:TERLIBAT_DI]->(i) SET t.peran = r.peran`,
    emails,
  );
}
// Contacts change jobs, so an email sent to/from an old address matches nobody. Fall back to the same name part
// (before the @) for a contact who worked at that interaction's account.
await run(`
  MATCH (i:Interaksi)-[:TENTANG]->(a:Akun)<-[:BEKERJA_DI|PERNAH_BEKERJA_DI]-(k:Kontak)
  WHERE (k.lokal = i.dari_lokal OR k.lokal = i.ke_lokal) AND NOT (k)-[:TERLIBAT_DI]->(i)
  CREATE (k)-[:TERLIBAT_DI {peran: CASE WHEN k.lokal = i.dari_lokal THEN 'pengirim' ELSE 'penerima' END, via: 'email lama'}]->(i)`);

// ponytail: plain keyword match. Replace with a Jev yes/no question per competitor if wording gets indirect.
await run(`
  MATCH (i:Interaksi), (c:Kompetitor)
  WHERE toLower(i.isi) CONTAINS toLower(c.id) OR toLower(i.subjek) CONTAINS toLower(c.id)
  CREATE (i)-[:MENYEBUT]->(c)`);

await run("UNWIND $rows AS r MATCH (e:Karyawan {id:r.diminta_oleh}), (d:Keputusan {id:r.decision_id}) CREATE (e)-[:MEMINTA]->(d)", decisions);
for (const [rel, hasil] of [["MENYETUJUI", "Disetujui"], ["MENOLAK", "Ditolak"], ["MENUNGGU_KEPUTUSAN", "Menunggu"]] as const)
  await run(
    `UNWIND $rows AS r MATCH (e:Karyawan {id:r.diputuskan_oleh}), (d:Keputusan {id:r.decision_id}) CREATE (e)-[:${rel}]->(d)`,
    decisions.filter((d) => d.keputusan === hasil),
  );
await run("UNWIND $rows AS r MATCH (d:Keputusan {id:r.decision_id}), (a:Akun {id:r.account_id}) CREATE (d)-[:TENTANG]->(a)", decisions);
await run(
  "UNWIND $rows AS r MATCH (x:Deal {id:r.deal_id}), (d:Keputusan {id:r.decision_id}) CREATE (x)-[:DIDASARKAN_PADA]->(d)",
  decisions.filter((d) => d.deal_id),
);
await run(
  "UNWIND $rows AS r MATCH (x:Kontrak {id:r.contract_id}), (d:Keputusan {id:r.decision_id}) CREATE (x)-[:DIDASARKAN_PADA]->(d)",
  contracts.filter((c) => c.decision_id),
);
await run(
  "UNWIND $rows AS r MATCH (d:Keputusan {id:r.decision_id}), (f:Fitur {id:r.fitur_dijanjikan}) CREATE (d)-[:MENJANJIKAN]->(f)",
  decisions.filter((d) => d.fitur_dijanjikan),
);
await run(
  "UNWIND $rows AS r MATCH (d:Keputusan {id:r.decision_id}), (i:Interaksi {id:r.bukti_interaction_id}) CREATE (d)-[:BERBUKTI]->(i)",
  decisions.filter((d) => d.bukti_interaction_id),
);
await run(
  "UNWIND $rows AS r MATCH (a:Akun {id:r.account_id}), (f:Fitur {id:r.feature_id}) CREATE (a)-[:MEMAKAI {bulan:r.bulan, pengguna_aktif:r.pengguna_aktif}]->(f)",
  featureUsage,
);

// ---- self-check: node counts match Postgres, and the K017 job change is wired up
const one = async (cypher: string) => (await session.run(cypher)).records[0].get(0);
const expected: [string, number][] = [
  ["Akun", accounts.length], ["Kontak", contacts.length], ["Karyawan", employees.length], ["Outlet", outlets.length],
  ["Deal", deals.length], ["Kontrak", contracts.length], ["Tiket", tickets.length], ["Interaksi", interactions.length],
  ["Keputusan", decisions.length], ["Bug", bugs.length], ["Rilis", releases.length], ["Fitur", features.length],
];
for (const [label, n] of expected) {
  const got = await one(`MATCH (n:${label}) RETURN count(n)`);
  if (got !== n) throw new Error(`${label}: graph has ${got}, Postgres has ${n}`);
  console.log(`${label.padEnd(10)} ${got}`);
}
const rinaOrgs: string[] = await one("MATCH (:Kontak {id:'K017'})-[:BEKERJA_DI|PERNAH_BEKERJA_DI]->(a:Akun) RETURN collect(a.id)");
if (!rinaOrgs.includes("C01") || !rinaOrgs.includes("P01")) throw new Error(`K017 should link C01 and P01, got ${rinaOrgs}`);
if ((await one("MATCH (:Kontak {id:'K017'})-[:TERLIBAT_DI]->(:Interaksi {id:'I0290'}) RETURN count(*)")) !== 1)
  throw new Error("K017 not linked to I0290 (old-email match failed)");
console.log("rels      ", await one("MATCH ()-[r]->() RETURN count(r)"));

await session.close();
await driver.close();
await db.$disconnect();
