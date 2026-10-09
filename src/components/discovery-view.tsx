import Link from "next/link";
import { rupiah, SNAPSHOT, tanggal, type Discovery, type Role, type Status } from "~/server/discovery";
import { ChatScope } from "./chat-provider";
import { EvidenceGraph } from "./evidence-graph";

export type Tab = "overview" | "graph" | "people" | "precedents";
export const TABS: [Tab, string][] = [
  ["overview", "Ringkasan"],
  ["graph", "Jalur bukti"],
  ["people", "Stakeholder"],
  ["precedents", "Preseden"],
];

const STATUS: Record<Status, { label: string; mark: string }> = {
  teridentifikasi_langsung: { label: "Teridentifikasi langsung", mark: "bg-accent" },
  teridentifikasi_lintas_sumber: { label: "Teridentifikasi lintas sumber", mark: "bg-accent" },
  kandidat: { label: "Kandidat, belum terbukti", mark: "border-2 border-warn" },
  belum_teridentifikasi: { label: "Belum teridentifikasi", mark: "border-2 border-dashed border-muted" },
};
const ROLE: Record<Role, string> = {
  decision_maker: "Pemutus pengadaan",
  approver: "Penandatangan",
  champion: "Champion",
  evaluator: "Evaluator teknis",
  candidate: "Kandidat",
  discovery_contact: "Kontak discovery",
  senior: "Pejabat senior",
};
const panel = "rounded-xl border border-line bg-panel p-5";
const h2 = "text-base font-medium";

export function DiscoveryView({ d, tab, focus }: { d: Discovery; tab: Tab; focus: string[] }) {
  const base = `/dashboard?q=${d.account.id}&asof=${d.asOf}`;
  return (
    <>
      <ChatScope accountId={d.account.id} name={d.account.name} asOf={d.asOf} graphIds={d.graph.nodes.map((n) => n.id)} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            <span className="font-mono">{d.account.id}</span> · {d.account.type === "prospek" ? "Prospek" : "Pelanggan"} · {d.account.industry}, {d.account.city}
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">{d.account.name}</h1>
        </div>
        <form action="/dashboard" className="flex items-end gap-2">
          <input type="hidden" name="q" value={d.account.id} />
          {tab !== "overview" && <input type="hidden" name="tab" value={tab} />}
          <div>
            <label htmlFor="asof" className="text-xs text-muted">
              Tanggal acuan
            </label>
            <input id="asof" name="asof" type="date" defaultValue={d.asOf} max={SNAPSHOT} className="mt-1 block min-h-10 rounded-md border border-line bg-background px-3 text-sm" />
          </div>
          <button type="submit" className="min-h-10 cursor-pointer rounded-md border border-line px-4 text-sm transition-colors duration-150 hover:border-white/50">
            Terapkan
          </button>
        </form>
      </header>
      <Method m={d.method} />

      <nav aria-label="Bagian akun" className="mt-6 border-b border-line">
        <ul className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {TABS.map(([t, label]) => (
            <li key={t}>
              <Link
                href={t === "overview" ? base : `${base}&tab=${t}`}
                aria-current={tab === t ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors duration-150 ${
                  tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {tab === "overview" && <Overview d={d} graphHref={`${base}&tab=graph`} />}
        {tab === "graph" && (
          <>
            <p className="mb-3 text-sm text-muted">
              Pilih node atau garis untuk membuka record sumbernya. Seret latar untuk menggeser, gulir untuk memperbesar, <kbd className="font-mono">f</kbd> untuk
              menampilkan semua.
            </p>
            {!d.people.length && (
              <p className="mb-3 rounded-lg border border-line p-3 text-sm">Tidak ada kontak pada {tanggal(d.asOf)}. Coba tanggal acuan lain.</p>
            )}
            <EvidenceGraph
              key={`${d.account.id}-${d.asOf}-${focus.join(",")}`}
              nodes={d.graph.nodes}
              edges={d.graph.edges}
              evidence={d.evidence}
              focusEvidence={[...d.decisionMaker.evidence, ...(d.approver?.evidence ?? [])]}
              focus={focus}
              account={d.account.name}
              asOf={d.asOf}
            />
          </>
        )}
        {tab === "people" && <People d={d} />}
        {tab === "precedents" && <Precedents d={d} />}
      </div>
    </>
  );
}

// Which reader turned this account's emails and meeting notes into claims (PRD_JEV.md §6).
function Method({ m }: { m: Discovery["method"] }) {
  const total = m.jev + m.rules;
  if (!total) return null;
  const jev = `Jev (${m.model}, pertanyaan ${m.version})`;
  return (
    <p className="mt-3 text-xs text-muted">
      Penilaian teks:{" "}
      {!m.jev
        ? "aturan kata kunci. Jev belum dijalankan untuk percakapan akun ini."
        : !m.rules
          ? `${jev} untuk ${total} dari ${total} percakapan akun ini.`
          : `${jev} untuk ${m.jev} dari ${total} percakapan; sisanya aturan kata kunci.`}
    </p>
  );
}

function Overview({ d, graphHref }: { d: Discovery; graphHref: string }) {
  const dm = d.people.find((p) => p.id === d.decisionMaker.personId);
  const approver = d.approver?.personId ? d.people.find((p) => p.id === d.approver!.personId) : null;
  const s = STATUS[d.decisionMaker.status];
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="answer" className={`${panel} shadow-bubble`}>
          <h2 id="answer" className="text-sm text-muted">
            Pemutus pengadaan · per {tanggal(d.asOf)}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className={`size-3 shrink-0 rounded-[2px] ${s.mark}`} aria-hidden />
            {s.label}
          </p>
          <p className="mt-2 font-display text-4xl">{dm ? dm.name : "Belum teridentifikasi"}</p>
          {dm && <p className="text-muted">{dm.title}</p>}
          <p className="mt-4 max-w-prose leading-relaxed">{d.decisionMaker.why}</p>
          {d.steps[0] && (
            <p className="mt-4 max-w-prose border-t border-line pt-4 leading-relaxed">
              <span className="text-sm font-medium">Langkah pertama: </span>
              {d.steps[0].text}
            </p>
          )}
          <Link
            href={graphHref}
            className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-black transition-opacity duration-150 hover:opacity-90"
          >
            Lihat jalur bukti
          </Link>
        </section>

        <section aria-labelledby="value" className={panel}>
          <h2 id="value" className="text-sm text-muted">
            Nilai peluang
          </h2>
          {d.deal ? (
            <>
              <p className="mt-2 font-display text-3xl tabular-nums">{rupiah(d.deal.value)}</p>
              <p className="text-sm text-muted">
                per tahun · Deal {d.deal.id} · {d.deal.stage} · {d.deal.status}
              </p>
              <p className="mt-3 text-sm">Pemegang deal: {d.deal.owner}</p>
            </>
          ) : (
            <p className="mt-2 text-muted">Belum ada deal untuk akun ini sampai {tanggal(d.asOf)}.</p>
          )}
          {d.approver && (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-sm font-medium">Penandatangan / penyetuju akhir</h3>
              <p className="mt-1">{approver ? `${approver.name}, ${approver.title}` : "Belum teridentifikasi"}</p>
              <p className="mt-1 text-sm text-muted">
                {STATUS[d.approver.status].label}. {d.approver.why}
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="steps" className={panel}>
          <h2 id="steps" className={h2}>
            Langkah berikutnya
          </h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 leading-relaxed">
            {d.steps.map((step) => (
              <li key={step.text}>{step.text}</li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="unknowns" className={panel}>
          <h2 id="unknowns" className={h2}>
            Belum diketahui
          </h2>
          {d.unknowns.length ? (
            <ul className="mt-3 list-disc space-y-3 pl-5 leading-relaxed">
              {d.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Tidak ada celah yang tercatat untuk akun ini.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function People({ d }: { d: Discovery }) {
  if (!d.people.length) return <p className="text-muted">Tidak ada kontak yang bekerja di akun ini pada {tanggal(d.asOf)}. Coba tanggal acuan lain.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Peta stakeholder {d.account.name}</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-2.5 font-medium">Peran</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Nama</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Jabatan, sejak</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Dasar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {d.people.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="px-4 py-3">{p.roles.map((r) => ROLE[r]).join(", ") || "Tercatat di akun"}</td>
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 text-muted">
                {p.title}, {tanggal(p.since)}
              </td>
              <td className="px-4 py-3 text-muted">{p.notes.join(" · ") || "Hanya tercatat di riwayat jabatan."}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Precedents({ d }: { d: Discovery }) {
  if (!d.precedents.length)
    return <p className="text-muted">Tidak ada keputusan di log yang terkait akun ini atau orang-orangnya sampai {tanggal(d.asOf)}.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-panel">
      {d.precedents.map((p) => (
        <li key={p.id} className="p-4">
          <p>
            <span className="font-mono text-sm text-muted">{p.id}</span> · {tanggal(p.date)} · {p.kind} {p.value} di {p.account}: {p.decision}
          </p>
          <p className="mt-1 text-muted">{p.reason}</p>
          {p.promise && <p className="mt-1 text-sm">Janji fitur: {p.promise}</p>}
          <p className="mt-1 text-sm text-muted">{p.link}</p>
        </li>
      ))}
    </ul>
  );
}
