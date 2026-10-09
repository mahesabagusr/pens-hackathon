import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DiscoveryView, TABS, type Tab } from "~/components/discovery-view";
import { currentUser } from "~/server/auth";
import { dataset } from "~/server/dataset";
import { accountOptions, discover, findAccount, rupiah, SNAPSHOT, tanggal } from "~/server/discovery";
import { judgments } from "~/server/judgments";

export const metadata: Metadata = { title: "Decision Maker Discovery | Decidely" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const panel = "rounded-xl border border-line bg-panel p-5";
const input = "mt-1 block min-h-11 w-full rounded-md border border-line bg-background px-3 text-sm";

export default function DashboardPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Suspense fallback={<Skeleton />}>
        <Discover searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy className="animate-pulse motion-reduce:animate-none">
      <span className="sr-only">Menyusun jawaban dari dataset…</span>
      <div className="h-4 w-48 rounded bg-white/10" />
      <div className="mt-3 h-9 w-72 rounded bg-white/10" />
      <div className="mt-8 h-11 border-b border-line" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-64 rounded-xl bg-panel" />
        <div className="h-64 rounded-xl bg-panel" />
      </div>
    </div>
  );
}

async function Discover({ searchParams }: { searchParams: Search }) {
  if (!(await currentUser().catch(() => null))) redirect("/login");
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const asOfRaw = String(params.asof ?? "");
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw) ? asOfRaw : (q.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? SNAPSHOT);
  const tab = (TABS.find(([t]) => t === params.tab)?.[0] ?? "overview") as Tab;
  const focus = String(params.focus ?? "").split(",").filter((id) => /^[\w-]{1,40}$/.test(id));

  let options: ReturnType<typeof accountOptions>;
  try {
    options = accountOptions();
  } catch {
    return (
      <p role="alert" className="rounded-xl border border-danger p-4">
        Dataset tidak bisa dibaca dari folder <code>data/</code>. Pastikan file CSV dan JSONL ada di sana, lalu muat ulang.
      </p>
    );
  }
  const account = q ? findAccount(q) : null;
  const result = account ? discover(account.account_id, asOf, await judgments()) : null;
  if (result) return <DiscoveryView d={result} tab={tab} focus={focus} />;

  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Decision Maker Discovery</h1>
      <p className="mt-1 text-muted">Siapa yang memutuskan pembelian, siapa yang perlu didekati, dan buktinya.</p>

      <form action="/dashboard" className={`mt-6 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end ${panel}`}>
        <div>
          <label htmlFor="q" className="text-sm font-medium">
            Akun atau pertanyaan
          </label>
          <input id="q" name="q" list="accounts" defaultValue={q} placeholder="P01, atau: siapa pemutus di Klinik Pratama Medika?" className={input} />
          <datalist id="accounts">
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="asof-start" className="text-sm font-medium">
            Tanggal acuan
          </label>
          <input id="asof-start" name="asof" type="date" defaultValue={asOf} max={SNAPSHOT} className={input} />
        </div>
        <button type="submit" className="min-h-11 cursor-pointer rounded-md bg-accent px-6 text-sm font-medium text-black transition-opacity duration-150 hover:opacity-90">
          Telusuri
        </button>
      </form>

      <section aria-labelledby="pick" className={`mt-6 ${panel}`}>
        {q ? (
          <p id="pick" role="alert">
            Akun dari &ldquo;{q}&rdquo; tidak dikenali. Tulis ID akun (misalnya P01 atau C14) atau nama akunnya.
          </p>
        ) : (
          <>
            <h2 id="pick" className="text-base font-medium">
              Pilih prospek untuk mulai
            </h2>
            <p className="mt-1 text-sm text-muted">
              {options.length} akun di dataset, tanggal acuan {tanggal(asOf)}. Akun pelanggan (C01 sampai C40) bisa dicari lewat kotak di atas atau di sidebar.
            </p>
          </>
        )}
        <Prospects asOf={asOf} />
      </section>
    </>
  );
}

function Prospects({ asOf }: { asOf: string }) {
  const { accounts, deals } = dataset();
  return (
    <ul className="mt-4 divide-y divide-line border-y border-line">
      {accounts
        .filter((a) => a.tipe === "prospek")
        .map((a) => {
          const deal = deals.find((x) => x.account_id === a.account_id && x.status === "Terbuka");
          return (
            <li key={a.account_id}>
              <Link
                href={`/dashboard?q=${a.account_id}&asof=${asOf}`}
                className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 transition-colors duration-150 hover:text-accent"
              >
                <span>
                  <span className="font-mono text-sm text-muted">{a.account_id}</span> {a.nama}
                </span>
                {deal && (
                  <span className="text-sm tabular-nums text-muted">
                    {deal.stage} · {rupiah(Number(deal.nilai_tahunan))}/tahun
                  </span>
                )}
              </Link>
            </li>
          );
        })}
    </ul>
  );
}
