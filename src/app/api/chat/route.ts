import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/genai";
import neo4j, { type Record as NeoRecord } from "neo4j-driver";
import { z } from "zod";
import { currentUser } from "~/server/auth";
import { buildVisual, citesIn, type Visual } from "~/server/chat-visuals";
import { dataset } from "~/server/dataset";
import { graph } from "~/server/graph";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const MAX_STEPS = 5; // three query rounds, one `show` round, one answer
const MAX_VISUALS = 2;
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
- Always add LIMIT. Each query is a costly round trip: answer in at most 3 query rounds, and fetch related facts together in one query (use OPTIONAL MATCH and collect()).
- Answer in the language the user wrote in. Plain text, no markdown, short lines. Cite ids (for example D-2025-11, I0061, C01) so each claim can be traced.
- If the graph does not hold the answer, say so. Do not guess or invent names, numbers or reasons.
- Each cypher result carries a query number. When a result is better seen than read (more than 5 rows, counts per group, a trend over time, a set of connected entities), call the show tool once with that number before you answer. For a graph, return nodes, relationships or paths from the query, not only properties. For bar or line charts, x and y must be returned column names and y must be numeric.`;

const CYPHER_TOOL: FunctionDeclaration = {
  name: "cypher",
  description:
    "Run one read-only Cypher query against the KasirNusa graph. Returns up to 50 rows as JSON.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Cypher statement with an explicit LIMIT",
      },
    },
    required: ["query"],
  },
};

const SHOW_TOOL: FunctionDeclaration = {
  name: "show",
  description:
    "Draw the rows of an earlier cypher result for the user as a graph, table, bar chart or line chart. The server draws from the real rows; you only choose how.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      query: { type: "integer", description: "The query number of a successful cypher result" },
      kind: { type: "string", enum: ["graph", "table", "bar", "line"] },
      title: { type: "string", description: "Short title in the user's language" },
      x: { type: "string", description: "bar/line only: column for categories or dates" },
      y: { type: "string", description: "bar/line only: numeric column" },
    },
    required: ["query", "kind", "title"],
  },
};

const Show = z.object({
  query: z.coerce.number().int().min(0),
  kind: z.enum(["graph", "table", "bar", "line"]),
  title: z.string().max(200),
  x: z.string().max(100).optional(),
  y: z.string().max(100).optional(),
});

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
  // What the user is looking at in the dashboard. Re-checked against the dataset below.
  context: z
    .object({
      accountId: z.string().regex(/^[A-Z]\d{2}$/).optional(),
      asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      selectedNodeId: z.string().max(40).optional(),
    })
    .optional(),
});

// Plain JSON for Neo4j values: nodes and relationships lose their driver wrappers.
const plain = (v: unknown): unknown =>
  neo4j.isNode(v) || neo4j.isRelationship(v)
    ? {
        ...("type" in v ? { _type: v.type } : { _labels: v.labels }),
        ...(plain(v.properties) as object),
      }
    : Array.isArray(v)
      ? v.map(plain)
      : v &&
          typeof v === "object" &&
          Object.getPrototypeOf(v) === Object.prototype
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))
        : v;

// Two guards: a keyword denylist (also blocks CALL, so no procedures or APOC), and the server's own
// classification of the statement, checked inside a transaction that is always rolled back.
const WRITES =
  /\b(create|merge|delete|set|remove|drop|call|load|foreach|detach|grant|deny|revoke|alter|start|stop|terminate)\b/i;

async function runCypher(query: string) {
  if (WRITES.test(query))
    throw new Error("Only read-only MATCH/RETURN queries are allowed.");
  const session = graph().session({ defaultAccessMode: neo4j.session.READ });
  const tx = session.beginTransaction();
  try {
    const result = await tx.run(query);
    const summary = await result.summary;
    if (summary.queryType !== "r")
      throw new Error("Only read-only queries are allowed.");
    const rows = result.records.slice(0, 50).map((r) => plain(r.toObject()));
    return { rows, total: result.records.length, records: result.records.slice(0, 500) };
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

// Gemini answers 503 when it is overloaded; that is usually gone within seconds.
async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (e) {
      if ((e as { status?: number }).status !== 503 || attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

export async function POST(req: Request) {
  if (!(await currentUser().catch(() => null)))
    return Response.json({ error: "Your session ended. Log in again." }, { status: 401 });

  if (!process.env.GEMINI_API_KEY)
    return Response.json(
      {
        error:
          "Chat is not configured. Add GEMINI_API_KEY to .env and restart.",
      },
      { status: 503 },
    );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (limited(ip))
    return Response.json(
      { error: "Too many questions. Wait a minute and try again." },
      { status: 429 },
    );

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return Response.json({ error: "Invalid request." }, { status: 400 });

  let system = SYSTEM;
  const ctx = body.data.context;
  if (ctx?.accountId) {
    const account = dataset().accounts.find((a) => a.account_id === ctx.accountId);
    if (!account) return Response.json({ error: "Unknown account." }, { status: 400 });
    const selected = ctx.selectedNodeId ? citesIn(ctx.selectedNodeId)[0] : undefined;
    system += `\n\nThe user is viewing account ${account.account_id} (${account.nama}) as of ${ctx.asOf ?? "2026-10-01"}.${
      selected ? ` They selected ${selected.id} (${selected.label}) in the evidence graph.` : ""
    } Resolve "this account", "dia", "di sini" and similar references with it.`;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents: Content[] = body.data.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const queries: { cypher: string; rows: number; error?: string }[] = [];
  const results: (NeoRecord[] | null)[] = []; // by query number, null when the query failed
  const visuals: Visual[] = [];
  const started = Date.now();

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction: system,
            maxOutputTokens: 4000,
            tools: [{ functionDeclarations: [CYPHER_TOOL, SHOW_TOOL] }],
          },
        }),
      );

      const reply = res.candidates?.[0]?.content;
      const calls = res.functionCalls ?? [];
      if (!calls.length) {
        const answer = res.text?.trim();
        if (!answer)
          return Response.json(
            { error: "The model returned no answer. Try rephrasing." },
            { status: 422 },
          );
        return Response.json({
          answer,
          queries,
          seconds: Math.round((Date.now() - started) / 1000),
          visuals,
          cites: citesIn(answer),
        });
      }

      // Echo the model turn back as is: it carries thought signatures Gemini needs on the next call.
      if (reply) contents.push(reply);
      const parts: Part[] = [];
      for (const call of calls) {
        let response: Record<string, unknown>;
        if (call.name === "show") {
          const spec = Show.safeParse(call.args);
          const records = spec.success ? results[spec.data.query] : null;
          const built = !spec.success
            ? "invalid arguments"
            : !records
              ? `query ${spec.data.query} did not succeed`
              : visuals.length >= MAX_VISUALS
                ? `at most ${MAX_VISUALS} visuals per answer`
                : buildVisual(records, spec.data);
          if (typeof built === "string") {
            queries.push({ cypher: `show ${spec.data?.kind ?? "?"} from query ${spec.data?.query ?? "?"}`, rows: 0, error: `visual skipped: ${built}` });
            response = { error: built };
          } else {
            visuals.push(built);
            response = { output: "Shown to the user." };
          }
        } else {
          const cypher = String(call.args?.query ?? "");
          const query = results.length;
          try {
            const { rows, total, records } = await runCypher(cypher);
            queries.push({ cypher, rows: total });
            results.push(records);
            response = {
              query,
              output: JSON.stringify(rows).slice(0, MAX_RESULT_CHARS),
            };
          } catch (e) {
            const error = e instanceof Error ? e.message : "Query failed";
            queries.push({ cypher, rows: 0, error });
            results.push(null);
            response = { query, error };
          }
        }
        parts.push({
          functionResponse: { id: call.id, name: call.name, response },
        });
      }
      contents.push({ role: "user", parts });
    }
    return Response.json(
      { error: "The question needed too many queries. Try a narrower one." },
      { status: 422 },
    );
  } catch (e) {
    // Duck-typed: Next can bundle the SDK twice, which breaks `instanceof ApiError`.
    const status = (e as { status?: number }).status;
    if (status === 429) {
      const wait = /retry in ([\d.]+)s/i.exec(
        String((e as Error).message),
      )?.[1];
      const hint = wait
        ? ` Try again in about ${Math.ceil(Number(wait))} seconds.`
        : "";
      return Response.json(
        {
          error: `Gemini quota reached (free keys allow 5 requests a minute per model).${hint}`,
        },
        { status: 429 },
      );
    }
    if (status === 503)
      return Response.json(
        { error: "Gemini is overloaded right now. Try again in a minute." },
        { status: 503 },
      );
    if (status === 400 || status === 401 || status === 403)
      return Response.json(
        {
          error:
            "Gemini rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL.",
        },
        { status: 503 },
      );
    console.error(e);
    return Response.json(
      { error: "Something went wrong while asking the graph." },
      { status: 500 },
    );
  }
}
