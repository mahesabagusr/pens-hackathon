import Anthropic from "@anthropic-ai/sdk";
import neo4j from "neo4j-driver";
import { z } from "zod";
import { graph } from "~/server/graph";

const MODEL = "claude-opus-5-5";
const MAX_STEPS = 6;
const MAX_RESULT_CHARS = 12_000;

const SYSTEM = `You answer questions about who made which decision, and why, at PT KasirNusa Teknologi (a point-of-sale software company). All people, companies and figures are synthetic.
Data lives in a Neo4j graph. Query it with the cypher tool (read-only, one statement per call). Dates are 'YYYY-MM-DD' strings. Every node has an id property equal to its natural key.

Nodes (key properties):
Akun(nama, tipe pelanggan|prospek, industri, kota, paket, jumlah_outlet, account_owner_id, champion_contact_id, nps_terakhir, health_score_dashboard)
Kontak(nama, email, jabatan_saat_ini, account_id_saat_ini) | Karyawan(nama, jabatan, email)
Keputusan(tanggal, tipe diskon|pengecualian|janji_fitur|eskalasi, keputusan Disetujui|Ditolak|Menunggu, nilai, alasan, fitur_dijanjikan, status_janji)
Deal(tipe, stage, nilai_tahunan, status, alasan_kalah, kompetitor) | Kontrak(paket, outlet_kontrak, diskon_pct, nilai_tahunan, tanggal_renewal, keterlambatan_bayar_12bln)
Interaksi(tanggal, tipe email|email_internal|catatan_meeting, dari, ke, subjek, isi) | Tiket(kategori, prioritas, status, judul, deskripsi) | Bug | Rilis | Fitur(nama, status, target_awal, target_terkini, catatan) | Outlet | Kompetitor | Organisasi

Relationships:
(Karyawan)-[:MEMINTA]->(Keputusan); (Karyawan)-[:MENYETUJUI|MENOLAK|MENUNGGU_KEPUTUSAN]->(Keputusan)
(Keputusan)-[:TENTANG]->(Akun); (Keputusan)-[:BERBUKTI]->(Interaksi); (Keputusan)-[:MENJANJIKAN]->(Fitur)
(Deal|Kontrak)-[:DIDASARKAN_PADA]->(Keputusan); (Akun)-[:MEMILIKI]->(Outlet|Deal|Kontrak); (Akun|Deal)-[:DIPEGANG_OLEH]->(Karyawan)
(Kontak)-[:CHAMPION_DARI]->(Akun); (Kontak)-[:BEKERJA_DI|PERNAH_BEKERJA_DI {jabatan, mulai, selesai}]->(Akun|Organisasi); (Kontak)-[:SALING_KENAL]-(Kontak)
(Interaksi)-[:TENTANG]->(Akun); (Interaksi)-[:MEMBALAS]->(Interaksi); (Kontak|Karyawan)-[:TERLIBAT_DI {peran}]->(Interaksi); (Interaksi)-[:MENYEBUT]->(Kompetitor)
(Deal)-[:BERSAING_DENGAN]->(Kompetitor); (Outlet|Akun)-[:MEMBUKA_TIKET]->(Tiket); (Kontak)-[:MELAPORKAN]->(Tiket); (Tiket)-[:DISEBABKAN_OLEH]->(Bug)
(Bug)-[:DI_VERSI]->(Rilis); (Bug)-[:TERKAIT_FITUR]->(Fitur); (Akun)-[:MEMAKAI {bulan, pengguna_aktif}]->(Fitur)

Rules:
- Company policy: a discount above 10% needs VP Sales approval and must appear in the decision log.
- The data is deliberately untidy. CRM fields can be stale (a champion may have left the account), and emails in Interaksi can use an old address. Cross-check sources before you conclude.
- Always add LIMIT. Run several small queries instead of one huge one.
- Answer in the language the user wrote in. Plain text, no markdown, short lines. Cite ids (for example D-2025-11, I0061, C01) so each claim can be traced.
- If the graph does not hold the answer, say so. Do not guess or invent names, numbers or reasons.`;

const CYPHER_TOOL: Anthropic.Beta.BetaTool = {
  name: "cypher",
  description: "Run one read-only Cypher query against the KasirNusa graph. Returns up to 50 rows as JSON.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Cypher statement with an explicit LIMIT" } },
    required: ["query"],
  },
};

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
});

// Plain JSON for Neo4j values: nodes and relationships lose their driver wrappers.
const plain = (v: unknown): unknown =>
  neo4j.isNode(v) || neo4j.isRelationship(v)
    ? { ...("type" in v ? { _type: v.type } : { _labels: v.labels }), ...plain(v.properties) as object }
    : Array.isArray(v)
      ? v.map(plain)
      : v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
        : v;

// Two guards: a keyword denylist (also blocks CALL, so no procedures or APOC), and the server's own
// classification of the statement, checked inside a transaction that is always rolled back.
const WRITES = /\b(create|merge|delete|set|remove|drop|call|load|foreach|detach|grant|deny|revoke|alter|start|stop|terminate)\b/i;

async function runCypher(query: string) {
  if (WRITES.test(query)) throw new Error("Only read-only MATCH/RETURN queries are allowed.");
  const session = graph().session({ defaultAccessMode: neo4j.session.READ });
  const tx = session.beginTransaction();
  try {
    const result = await tx.run(query);
    const summary = await result.summary;
    if (summary.queryType !== "r") throw new Error("Only read-only queries are allowed.");
    const rows = result.records.slice(0, 50).map((r) => plain(r.toObject()));
    return { rows, total: result.records.length };
  } finally {
    await tx.rollback();
    await session.close();
  }
}

// ponytail: in-memory, per process. Use Redis or the platform's limiter if this runs on more than one instance.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: "Chat is not configured. Add ANTHROPIC_API_KEY to .env and restart." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (limited(ip)) return Response.json({ error: "Too many questions. Wait a minute and try again." }, { status: 429 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = body.data.messages;
  const queries: { cypher: string; rows: number; error?: string }[] = [];
  const started = Date.now();

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        tools: [CYPHER_TOOL],
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages,
      });

      if (res.stop_reason === "refusal")
        return Response.json({ error: "The model declined this question." }, { status: 422 });

      const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (res.stop_reason !== "tool_use" || !calls.length) {
        const answer = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
        return Response.json({ answer, queries, seconds: Math.round((Date.now() - started) / 1000) });
      }

      // Echo the whole assistant turn back unchanged so thinking blocks stay valid.
      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const call of calls) {
        const cypher = String((call.input as { query?: unknown }).query ?? "");
        try {
          const { rows, total } = await runCypher(cypher);
          queries.push({ cypher, rows: total });
          results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(rows).slice(0, MAX_RESULT_CHARS) });
        } catch (e) {
          const error = e instanceof Error ? e.message : "Query failed";
          queries.push({ cypher, rows: 0, error });
          results.push({ type: "tool_result", tool_use_id: call.id, content: error, is_error: true });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return Response.json({ error: "The question needed too many queries. Try a narrower one." }, { status: 422 });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "The model is busy. Try again shortly." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "ANTHROPIC_API_KEY was rejected." }, { status: 503 });
    console.error(e);
    return Response.json({ error: "Something went wrong while asking the graph." }, { status: 500 });
  }
}
