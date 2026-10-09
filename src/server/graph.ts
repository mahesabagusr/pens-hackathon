import neo4j, { type Driver } from "neo4j-driver";

// One driver per process (it holds the connection pool); reuse across hot reloads.
// Created lazily so `next build` can import this module without NEO4J_* set.
const globalForNeo4j = globalThis as unknown as { neo4j?: Driver };

export function graph() {
  return (globalForNeo4j.neo4j ??= neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
    { disableLosslessIntegers: true }, // return counts as JS numbers, not neo4j Integer
  ));
}
