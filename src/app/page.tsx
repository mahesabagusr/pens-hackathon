import { Suspense } from "react";
import { dictionaryEntries, graphCounts, traceOf } from "~/server/landing";
import { AskButton, Chat } from "./chat";
import { Dictionary } from "./dictionary";

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const note = "text-sm text-muted";

function Unavailable({ what }: { what: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger bg-panel p-4 text-sm">
      Could not load {what}. Check that Postgres and Neo4j are running (npm run db:up), then reload.
    </p>
  );
}

async function Counts() {
  const c = await graphCounts().catch(() => null);
  if (!c) return <Unavailable what="the graph counts" />;
  const rows: [string, number][] = [
    ["Decisions", c.decisions],
    ["Accounts", c.accounts],
    ["Contacts", c.contacts],
    ["Emails and meeting notes", c.interactions],
    ["Support tickets", c.tickets],
    ["Graph relationships", c.relationships],
  ];
  return (
    <dl className="divide-y divide-line">
      {rows.map(([label, n]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-sm">{label}</dt>
          <dd className="font-display text-xl tabular-nums">{n.toLocaleString("en-US")}</dd>
        </div>
      ))}
    </dl>
  );
}

async function DictionarySection() {
  const entries = await dictionaryEntries().catch(() => null);
  return entries ? <Dictionary entries={entries} /> : <Unavailable what="the decision log" />;
}

function Step({ rel, title, children }: { rel: string; title: string; children: React.ReactNode }) {
  return (
    <li className="relative border-l border-white/25 pb-8 pl-6 last:border-transparent last:pb-0">
      <span className="absolute -left-[5px] top-2 size-2.5 rounded-full bg-accent" aria-hidden />
      <p className="text-sm text-dim">{rel}</p>
      <h3 className="font-display text-2xl">{title}</h3>
      <div className="mt-1 max-w-prose text-dim [&_strong]:font-normal [&_strong]:text-white">{children}</div>
    </li>
  );
}

async function Trace() {
  const t = await traceOf("D-2025-11").catch(() => null);
  if (!t) return <Unavailable what="the decision trace" />;
  return (
    <ol>
      <Step rel="Keputusan" title={`${t.id}: ${t.nilai} discount, ${t.keputusan.toLowerCase()}`}>
        <p>
          <strong>{t.alasan}</strong>
        </p>
        <p>
          {when(t.tanggal)}. Asked by {t.diminta}. Decided by {t.diputuskan}.
        </p>
      </Step>
      <Step rel="TENTANG" title={`${t.akun.nama} (${t.akun.id})`}>
        <p>
          {t.akun.paket} plan, {t.akun.outlet} outlets.
        </p>
      </Step>
      <Step rel="DIDASARKAN_PADA" title={`Deal ${t.deal.id}`}>
        <p>
          A {t.deal.tipe} worth {rupiah(t.deal.nilai)} a year, {t.deal.status.toLowerCase()}.
        </p>
      </Step>
      <Step rel="BERBUKTI" title={`Email ${t.bukti.id}`}>
        <p>
          <strong>{t.bukti.subjek}</strong>
        </p>
        <p>
          {when(t.bukti.tanggal)}, from {t.bukti.dari}.
        </p>
      </Step>
      <Step rel="MENJANJIKAN" title={`${t.fitur.nama} (${t.fitur.id})`}>
        <p>
          Promise status: <strong>{t.fitur.janji}</strong>. Roadmap says {t.fitur.status.toLowerCase()}, target moved from{" "}
          {t.fitur.targetAwal} to {t.fitur.targetKini?.toLowerCase()}.
        </p>
      </Step>
      {t.lanjutan && (
        <Step rel="Same account, later" title={`${t.lanjutan.id}: ${t.lanjutan.tipe}, ${t.lanjutan.keputusan.toLowerCase()}`}>
          <p>
            {when(t.lanjutan.tanggal)}. <strong>{t.lanjutan.nilai}</strong>. {t.lanjutan.alasan}
          </p>
        </Step>
      )}
    </ol>
  );
}

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <a href="#top" className="font-display text-xl">
          Decision Dictionary
        </a>
        <nav aria-label="Sections" className="flex gap-1 text-sm sm:gap-4">
          {[
            ["#chat", "Ask"],
            ["#dictionary", "Dictionary"],
            ["#trace", "Trace"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="flex min-h-11 items-center px-2 text-muted hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 text-center sm:pt-20">
          <h1 className="font-display text-5xl leading-[1.1] sm:text-7xl">Who decided it, and why?</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            Ask the context graph about any discount, exception, feature promise or escalation at KasirNusa. Every answer
            shows the queries that found it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#chat" className="flex min-h-12 items-center rounded-xl bg-night px-6 font-medium text-white">
              Ask the graph
            </a>
            <a href="#dictionary" className="flex min-h-12 items-center rounded-xl border border-line bg-white px-6 font-medium">
              Browse the dictionary
            </a>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4">
          <div className="grid overflow-hidden rounded-[20px] border border-line shadow-[0_1px_2px_#11111114] lg:grid-cols-[17rem_1fr]">
            <aside className="order-2 border-t border-line bg-panel p-4 sm:p-6 lg:order-1 lg:border-r lg:border-t-0">
              <h2 className="font-display text-xl">In the graph</h2>
              <div className="mt-3">
                <Suspense fallback={<p className={note}>Counting records…</p>}>
                  <Counts />
                </Suspense>
              </div>
              <p className={`mt-4 ${note}`}>
                Counted from Postgres and Neo4j when the page loads. Synthetic dataset, period Oct 2025 to Sep 2026, with
                decisions back to 2024.
              </p>
            </aside>
            <div className="order-1 bg-white lg:order-2">
              <Chat />
            </div>
          </div>
        </div>

        <section id="dictionary" className="mx-auto grid max-w-6xl scroll-mt-4 gap-10 px-4 py-24 lg:grid-cols-[18rem_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <h2 className="font-display text-4xl leading-tight">A dictionary of decisions</h2>
            <p className="mt-4 text-muted">
              The decision log, written as entries: the call, the reason, who asked and who decided. Entries are quoted from
              the log, so the reasons are in Indonesian.
            </p>
          </div>
          <Suspense fallback={<p className={note}>Loading the decision log…</p>}>
            <DictionarySection />
          </Suspense>
        </section>

        <section id="trace" className="on-night scroll-mt-4 bg-night text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 lg:grid-cols-[22rem_1fr] lg:gap-16">
            <div>
              <h2 className="font-display text-4xl leading-tight">Follow one decision through the graph</h2>
              <p className="mt-4 text-dim">
                D-2025-11 is a 15% discount, above the 10% policy line. It was approved as an exception in exchange for a
                feature promise. The graph links the decision to the deal, the email that backs it and the feature it
                promised.
              </p>
              <AskButton
                question="Walk me through decision D-2025-11. Was the promised feature delivered, and what happened after?"
                className="mt-6 min-h-11 font-medium text-accent underline underline-offset-4 hover:no-underline"
              >
                Ask the graph about this chain
              </AskButton>
            </div>
            <Suspense fallback={<p className="text-dim">Tracing D-2025-11…</p>}>
              <Trace />
            </Suspense>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="font-display text-xl">Decision Dictionary</p>
        <p className={`mt-2 max-w-prose ${note}`}>
          Built on the synthetic dataset for PT KasirNusa Teknologi from the Context Graphs hackathon. Every company, person
          and figure is fictional.
        </p>
      </footer>
    </>
  );
}
