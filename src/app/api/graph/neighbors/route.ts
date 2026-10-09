import neo4j from "neo4j-driver";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { currentUser } from "~/server/auth";
import { SNAPSHOT } from "~/server/discovery";
import { LABELS, neighbors } from "~/server/neighbors";

const Query = z.object({
  id: z.string().min(1).max(80),
  label: z.enum(LABELS),
  asof: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => d <= SNAPSHOT, `asof must be on or before ${SNAPSHOT}`)
    .default(SNAPSHOT),
});

// One-hop Neo4j neighbors for "Tampilkan tetangga" in Jalur bukti (PRD_GRAPH_EXPLORE.md §9).
export async function GET(req: NextRequest) {
  if (!(await currentUser().catch(() => null))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const q = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return Response.json({ error: "invalid", issues: q.error.issues }, { status: 400 });
  try {
    const result = await neighbors({ id: q.data.id, label: q.data.label, asOf: q.data.asof });
    if (!result) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("neighbors", err);
    // Only a lost connection is "Neo4j is down"; anything else is a bug here, and saying "unreachable" would mislead.
    const down = neo4j.isRetryableError(err);
    return Response.json({ error: down ? "graph_unavailable" : "failed" }, { status: down ? 503 : 500 });
  }
}
