import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { graph } from "~/server/graph";
import { baseProcedure, createTRPCRouter } from "../init";

// Postgres (Prisma) owns user records; Neo4j holds only the relationship graph,
// keyed by the Postgres id. Graph nodes are created lazily via MERGE on follow.
export const userRouter = createTRPCRouter({
  list: baseProcedure.query(() => db.user.findMany({ orderBy: { createdAt: "asc" } })),

  create: baseProcedure
    .input(z.object({ email: z.email(), name: z.string().min(1).max(100).optional() }))
    .mutation(async ({ input }) => {
      if (await db.user.findUnique({ where: { email: input.email } }))
        throw new TRPCError({ code: "CONFLICT", message: "Email already exists" });
      return db.user.create({ data: input });
    }),

  follow: baseProcedure
    .input(
      z
        .object({ followerId: z.cuid(), followeeId: z.cuid() })
        .refine((v) => v.followerId !== v.followeeId, "Cannot follow yourself"),
    )
    .mutation(async ({ input }) => {
      const found = await db.user.count({ where: { id: { in: [input.followerId, input.followeeId] } } });
      if (found !== 2) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      await graph().executeQuery(
        `MERGE (a:User {id: $followerId})
         MERGE (b:User {id: $followeeId})
         MERGE (a)-[:FOLLOWS]->(b)`,
        input,
      );
      return { ok: true };
    }),

  following: baseProcedure.input(z.object({ userId: z.cuid() })).query(async ({ input }) => {
    const { records } = await graph().executeQuery(
      "MATCH (:User {id: $userId})-[:FOLLOWS]->(f:User) RETURN f.id AS id",
      input,
    );
    return records.map((r) => r.get("id") as string);
  }),

  // Friends-of-friends the user doesn't already follow, ranked by mutual count,
  // then hydrated from Postgres.
  suggestions: baseProcedure.input(z.object({ userId: z.cuid() })).query(async ({ input }) => {
    const { records } = await graph().executeQuery(
      `MATCH (me:User {id: $userId})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(s:User)
       WHERE s <> me AND NOT (me)-[:FOLLOWS]->(s)
       RETURN s.id AS id, count(*) AS mutuals
       ORDER BY mutuals DESC LIMIT 10`,
      input,
    );
    const mutuals = new Map(records.map((r) => [r.get("id") as string, r.get("mutuals") as number]));
    const users = await db.user.findMany({ where: { id: { in: [...mutuals.keys()] } } });
    return users
      .map((u) => ({ ...u, mutuals: mutuals.get(u.id)! }))
      .sort((a, b) => b.mutuals - a.mutuals);
  }),
});
