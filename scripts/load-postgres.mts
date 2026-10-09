import "dotenv/config";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/server/db";

type Spec = { int?: string[]; date?: string[]; bool?: string[]; list?: string[] };
type Delegate = {
  createMany(a: { data: Record<string, unknown>[] }): Promise<unknown>;
  deleteMany(): Promise<unknown>;
  count(): Promise<number>;
};

// Parents before children (FK order). Reversed for the wipe.
const steps: [model: string, file: string, spec: Spec][] = [
  ["employee", "employees.csv", {}],
  ["release", "releases.csv", { date: ["tanggal_rilis"] }],
  ["feature", "features.csv", {}],
  ["account", "crm_accounts.csv", { int: ["jumlah_outlet", "nps_terakhir"] }],
  ["contact", "crm_contacts.csv", {}],
  ["employmentHistory", "contact_employment_history.csv", { date: ["mulai", "selesai"] }],
  ["deal", "crm_deals.csv", { int: ["outlet", "nilai_tahunan"], date: ["stage_sejak", "dibuat"] }],
  ["outlet", "outlets.csv", { bool: ["mode_offline_aktif"] }],
  ["bug", "bugs.csv", { date: ["dibuat", "selesai"] }],
  ["interaction", "interactions.jsonl", { date: ["tanggal"], list: ["peserta"] }],
  ["decision", "decision_log.csv", { date: ["tanggal"] }],
  [
    "contract",
    "contracts_billing.csv",
    {
      int: ["outlet_kontrak", "batas_outlet_paket", "harga_per_outlet_bulan", "diskon_pct", "nilai_tahunan", "keterlambatan_bayar_12bln"],
      date: ["mulai", "tanggal_renewal"],
    },
  ],
  ["supportTicket", "support_tickets.csv", { date: ["dibuat", "diselesaikan"] }],
  ["featureUsageMonthly", "feature_usage_monthly.csv", { int: ["pengguna_aktif"] }],
  [
    "productUsageDaily",
    "product_usage_daily.csv",
    { int: ["jumlah_transaksi", "transaksi_offline_tersinkron"], date: ["tanggal"] },
  ],
];

const read = (file: string): Record<string, string>[] => {
  const text = readFileSync(`data/${file}`, "utf8");
  return file.endsWith(".jsonl")
    ? text.split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : parse(text, { columns: true, bom: true, skip_empty_lines: true });
};

const convert = (row: Record<string, string>, s: Spec) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      s.list?.includes(k)
        ? v.split(";").filter(Boolean)
        : v === ""
          ? null
          : s.int?.includes(k)
            ? Number.isNaN(Number(v)) ? null : Number(v) // "tanpa batas" (unlimited) -> null
            : s.date?.includes(k)
              ? new Date(v)
              : s.bool?.includes(k)
                ? v === "ya"
                : v,
    ]),
  );

const table = (model: string) => (db as unknown as Record<string, Delegate>)[model];

for (const [model] of [...steps].reverse()) await table(model).deleteMany();

for (const [model, file, spec] of steps) {
  const data = read(file).map((r) => convert(r, spec));
  for (let i = 0; i < data.length; i += 2000) await table(model).createMany({ data: data.slice(i, i + 2000) });
  const n = await table(model).count();
  if (n !== data.length) throw new Error(`${model}: loaded ${n}, file has ${data.length}`);
  console.log(`${model.padEnd(20)} ${n}`);
}

await db.$disconnect();
