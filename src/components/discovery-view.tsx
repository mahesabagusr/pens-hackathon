import Link from "next/link";
import { rupiah, SNAPSHOT, tanggal, type Discovery, type Role, type Status } from "~/server/discovery";
import { ChatScope } from "./chat-provider";
import { ContactPlanCard } from "./contact-plan";
import { EvidenceGraph } from "./evidence-graph";
import { Icon } from "./icon";
import { InformationCard } from "./information-card";
import { NextStepsCard } from "./next-steps-card";

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
      </header>

      <div className="account-toolbar">
        <nav aria-label="Bagian akun" className="account-tabs">
          <ul>
            {TABS.map(([t, label]) => (
              <li key={t}>
                <Link href={t === "overview" ? base : `${base}&tab=${t}`} aria-current={tab === t ? "page" : undefined} className={tab === t ? "is-active" : ""}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action="/dashboard" className="account-date-form">
          <input type="hidden" name="q" value={d.account.id} />
          {tab !== "overview" && <input type="hidden" name="tab" value={tab} />}
          <div className="account-date-field">
            <label htmlFor="asof" className="sr-only">Tanggal acuan</label>
            <input id="asof" name="asof" type="date" defaultValue={d.asOf} max={SNAPSHOT} />
          </div>
          <button type="submit">Terapkan</button>
        </form>
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview d={d} graphHref={`${base}&tab=graph`} />}
        {tab === "graph" && (
          <section className="evidence-graph-frame" aria-label="Jalur bukti">
            <h2 className="evidence-graph-frame-title"><Icon name="graph" /> Jalur bukti</h2>
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
          </section>
        )}
        {tab === "people" && <People d={d} />}
        {tab === "precedents" && <Precedents d={d} />}
      </div>
    </>
  );
}

// Which reader turned this account's emails and meeting notes into claims (PRD_JEV.md §6).
function Overview({ d, graphHref }: { d: Discovery; graphHref: string }) {
  const dm = d.people.find((p) => p.id === d.decisionMaker.personId);
  const approver = d.approver?.personId ? d.people.find((p) => p.id === d.approver!.personId) : null;
  const s = STATUS[d.decisionMaker.status];
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <InformationCard id="answer" title="Pemutus pengadaan" detail={tanggal(d.asOf)} focal>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className={`size-3 shrink-0 rounded-[2px] ${s.mark}`} aria-hidden />
            {s.label}
          </p>
          <p className="mt-2 font-display text-4xl">{dm ? dm.name : "Belum teridentifikasi"}</p>
          {dm && <p className="text-muted">{dm.title}</p>}
          <p className="mt-4 max-w-prose leading-relaxed">{d.decisionMaker.why}</p>
          <Link
            href={graphHref}
            className="evidence-action-button mt-5 inline-flex min-h-11 items-center rounded-md px-5 text-sm font-medium transition-opacity duration-150 hover:opacity-90"
          >
            Lihat jalur bukti
          </Link>
        </InformationCard>

        <InformationCard id="value" title="Nilai peluang" detail={d.deal ? "per tahun" : undefined}>
          {d.deal ? (
            <>
              <p className="mt-2 font-display text-3xl tabular-nums">{rupiah(d.deal.value)}</p>
              <div className="deal-metadata-row">
                <span className="next-step-assignee deal-owner" title="Pemegang deal">
                  <span className="next-step-avatar" aria-hidden="true">{d.deal.owner.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>
                  <span>{d.deal.owner}</span>
                </span>
                <span className="decision-meta-label">{d.deal.id}</span>
                <span className="decision-meta-label">{d.deal.stage}</span>
                <span className="decision-meta-label">{d.deal.status}</span>
              </div>
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
        </InformationCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NextStepsCard key={`${d.account.id}-${d.asOf}`} steps={d.steps.map((step) => step.text)} owner={d.deal?.owner ?? null} />
        <InformationCard id="unknowns" title="Belum diketahui">
          {d.unknowns.length ? (
            <ol className="unknown-list">
              {d.unknowns.map((u, index) => (
                <li key={u}><span className="sidebar-count unknown-number" aria-hidden="true">{index + 1}</span><span>{u}</span></li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-muted">Tidak ada celah yang tercatat untuk akun ini.</p>
          )}
        </InformationCard>
      </div>
    </div>
  );
}

function People({ d }: { d: Discovery }) {
  // With nobody at the account, the contact card's own empty message says what to do; the table would add nothing.
  if (!d.people.length) return <ContactPlanCard d={d} />;
  return (
    <div className="space-y-6">
      <ContactPlanCard d={d} />
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
