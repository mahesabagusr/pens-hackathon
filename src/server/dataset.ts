import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

// Read straight from data/ so every answer can cite file + row, which the database copy no longer knows.
// `_row` is the 1-based line number in the source file (CSV header is line 1), kept as a string like every other field.
export type Row = Record<string, string>;

const DIR = join(process.cwd(), "data");

function csv(file: string): Row[] {
  const rows = parse(readFileSync(join(DIR, file), "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return rows.map((r, i) => ({ ...r, _row: String(i + 2) }));
}

function jsonl(file: string): Row[] {
  return readFileSync(join(DIR, file), "utf8")
    .split("\n")
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => line.trim())
    .map(({ line, i }) => ({ ...(JSON.parse(line) as Record<string, string>), _row: String(i + 1) }));
}

function load() {
  return {
    accounts: csv("crm_accounts.csv"),
    contacts: csv("crm_contacts.csv"),
    history: csv("contact_employment_history.csv"),
    deals: csv("crm_deals.csv"),
    employees: csv("employees.csv"),
    decisions: csv("decision_log.csv"),
    features: csv("features.csv"),
    interactions: jsonl("interactions.jsonl"),
    tickets: csv("support_tickets.csv"),
    outlets: csv("outlets.csv"),
    contracts: csv("contracts_billing.csv"),
    bugs: csv("bugs.csv"),
  };
}

export type Dataset = ReturnType<typeof load>;

// ponytail: loaded once per server process; restart after editing data/. Add a file watcher if data changes live.
let cache: Dataset | undefined;
export const dataset = () => (cache ??= load());
