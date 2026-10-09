import Link from "next/link";
import { dataset } from "~/server/dataset";
import { rupiah, SNAPSHOT, tanggal, type Discovery, type Status } from "~/server/discovery";
import { ChatScope } from "./chat-provider";
import { AccountDatePicker } from "./account-date-picker";
import { ContactPlanCard } from "./contact-plan";
import { EvidenceGraph } from "./evidence-graph";
import { Icon } from "./icon";
import { InformationCard } from "./information-card";
import { SourceLabel } from "./source-label";
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
          <AccountDatePicker key={d.asOf} value={d.asOf} max={SNAPSHOT} />
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
        <InformationCard id="answer" title="Pemutus pengadaan" detail={<span className="answer-header-meta"><span>{tanggal(d.asOf)}</span><span className="answer-status">{d.decisionMaker.status === "teridentifikasi_lintas_sumber" ? "Lintas Sumber" : s.label}</span></span>} focal>
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
              <dl className="deal-metadata-list">
                <div><dt>Owner</dt><dd><span className="next-step-assignee deal-owner"><span className="next-step-avatar" aria-hidden>{d.deal.owner.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><span>{d.deal.owner}</span></span></dd></div>
                <div><dt>Deal ID</dt><dd><span className="decision-meta-label">{d.deal.id}</span></dd></div>
                <div><dt>Stage</dt><dd><span className="decision-meta-label">{d.deal.stage}</span></dd></div>
                <div><dt>Status</dt><dd><span className="decision-meta-label">{d.deal.status}</span></dd></div>
              </dl>
            </>
          ) : (
            <p className="mt-2 text-muted">Belum ada deal untuk akun ini sampai {tanggal(d.asOf)}.</p>
          )}
          {d.approver && (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="text-sm font-medium">Penandatanganan / Penyetuju Akhir</h3>
              <div className="approver-profile">
                <div className="approver-person">
                  <span className="approver-avatar" role="img" aria-label={`Avatar ${approver?.name ?? "belum teridentifikasi"}`}>
                    {approver ? approver.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : <Icon name="contacts" />}
                  </span>
                  <div><p className="font-semibold text-white">{approver?.name ?? "Belum teridentifikasi"}</p><p className="text-xs text-muted">{approver?.title ?? "Jabatan belum diketahui"}</p></div>
                </div>
                <SourceLabel evidence={d.evidence} ids={d.approver.evidence} />
                <p className="mt-3 text-sm text-muted">{STATUS[d.approver.status].label}. {d.approver.why}</p>
              </div>
            </div>
          )}
        </InformationCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NextStepsCard steps={d.steps.map((step) => step.text)} owner={d.deal?.owner ?? null} />
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
  return <ContactPlanCard d={d} />;
}

function Precedents({ d }: { d: Discovery }) {
  const accounts = dataset().accounts;
  if (!d.precedents.length)
    return <p className="text-muted">Tidak ada keputusan di log yang terkait akun ini atau orang-orangnya sampai {tanggal(d.asOf)}.</p>;
  return (
    <ul className="precedent-list">
      {d.precedents.map((p) => (
        <li key={p.id}>
          <InformationCard id={`precedent-${p.id}`} title={`${p.kind.charAt(0).toUpperCase()}${p.kind.slice(1)} ${p.value}`} detail={p.id}>
            <div className="precedent-labels">
              <span className="precedent-badge"><Icon name="calendar" className="size-3.5" />{tanggal(p.date)}</span>
              <span className="precedent-badge">{p.decision}</span>
              <SourceLabel evidence={d.evidence} ids={p.evidence} title={`Preseden ${p.id}`} />
              <Link className="precedent-badge precedent-account-chip" href={`/dashboard?q=${p.account}&asof=${d.asOf}`} title={p.account}><Icon name="building" className="size-3.5" />{accounts.find((a) => a.account_id === p.account)?.nama ?? p.account}</Link>
            </div>

            <p className="mt-3">{p.reason}</p>
            {p.promise && <div className="precedent-promise"><h3>Janji fitur</h3><p>{p.promise}</p></div>}
            <p className="mt-3 text-sm text-muted">{p.link}</p>
          </InformationCard>
        </li>
      ))}
    </ul>
  );
}
