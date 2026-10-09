import neo4j, { type Driver } from "neo4j-driver";

const globalForNeo4j = globalThis as unknown as { neo4j?: Driver };

export function graph() {
  return (globalForNeo4j.neo4j ??= neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
    { disableLosslessIntegers: true },
  ));
}
