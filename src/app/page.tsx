// Design Read: product landing for sales and RevOps leaders, basedash direction in dark
// (#08080a page, #131316 panels, #00c758 accent, Glitch display), dial ENERGY 2 / RHYTHM 3 / MOTION 2.
// Static on purpose: no chat, no database. The sample is decision D-2025-11 from the synthetic dataset in data/.

import Image from "next/image";
import { Reveal, ScrollLink } from "./motion-ui";

const note = "text-sm text-muted";
const mono = "font-mono text-[13px] leading-6";

const links: [string, string, string][] = [
  ["TENTANG", "Kopi Lintas Nusantara", "C01"],
  ["DIDASARKAN_PADA", "Deal DL-008", "renewal"],
  ["BERBUKTI", "Email I0061", "28 Nov 2025"],
  ["MENJANJIKAN", "Integrasi akuntansi", "FEAT-07"],
];

function Step({ rel, title, children }: { rel: string; title: string; children: React.ReactNode }) {
  return (
    <li className="relative border-l border-line pb-5 pl-6 last:border-transparent last:pb-0">
      <span className="absolute -left-[5px] top-2 size-2.5 rounded-[2px] bg-accent" aria-hidden />
      <Reveal>
        <p className={`${mono} text-muted`}>{rel}</p>
        <h3 className="font-display text-2xl">{title}</h3>
        <div className="mt-1 max-w-prose text-muted [&_strong]:font-normal [&_strong]:text-ink">{children}</div>
      </Reveal>
    </li>
  );
}

export default function Home() {
  return (
    <>
      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[5fr_6fr] lg:gap-12 lg:py-14">
          <Reveal>
            <h1 className="font-display text-5xl leading-[1.1] sm:text-6xl">Who decided it, and why?</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Decision Dictionary writes each discount, exception and feature promise at KasirNusa as an entry, then links it
              to the deal, the email and the roadmap behind it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ScrollLink
                href="#trace"
                className="flex min-h-12 items-center rounded-md bg-accent px-6 font-medium text-black transition-opacity duration-150 hover:opacity-90"
              >
                Follow one decision
              </ScrollLink>
              <ScrollLink
                href="#entry"
                className="flex min-h-12 items-center rounded-md border border-line px-6 font-medium transition-colors duration-150 hover:border-ink"
              >
                See what an entry holds
              </ScrollLink>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="overflow-hidden rounded-[20px] border border-line bg-panel shadow-[0_1px_2px_#11111114]">
              <article className="p-5">
                <p className={note}>Dictionary entry · D-2025-11</p>
                <h2 className="mt-1 font-display text-4xl">
                  Diskon 15%
                  <span className="ml-3 font-sans text-lg italic text-muted">discount</span>
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-[2px] bg-ok" aria-hidden />
                  Disetujui, 28 Nov 2025
                </p>
                <p className="mt-3 max-w-prose">
                  Pengecualian: akun strategis 42 outlet; komitmen integrasi akuntansi rilis Q3 2026.
                </p>
                <p className={`mt-3 ${note}`}>Asked by Sari Puspita, Account Manager. Decided by Andi Wiratama, VP Sales.</p>
              </article>
              <aside className="border-t border-line p-5">
                <h2 className="font-display text-xl">Linked in the graph</h2>
                <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {links.map(([rel, name, meta]) => (
                    <li key={rel}>
                      <p className={`${mono} text-accent`}>{rel}</p>
                      <p>{name}</p>
                      <p className="text-sm text-muted">{meta}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted">Promise status: Belum ditepati</p>
              </aside>
            </div>
            <p className={`mt-2 ${note}`}>
              Sample from the synthetic dataset for PT KasirNusa Teknologi. Every company, person and figure is fictional.
            </p>
          </Reveal>
        </section>

        <section id="problem" className="border-y border-line bg-panel">
          <Reveal className="mx-auto max-w-6xl px-4 py-12">
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end lg:gap-12">
              <h2 className="font-display text-4xl leading-tight">The log says approved. The reason lives in an email.</h2>
              <p className="text-lg text-muted">
                A decision log keeps the verdict. The promise that bought the discount sits in someone&apos;s inbox, and the
                roadmap moves on without it.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-background p-5">
                <p className={note}>decision_log.csv</p>
                <dl className={`mt-2 divide-y divide-line ${mono}`}>
                  {[
                    ["decision_id", "D-2025-11"],
                    ["tipe", "diskon"],
                    ["keputusan", "Disetujui"],
                    ["nilai", "15%"],
                    ["bukti_interaction_id", "I0061"],
                    ["fitur_dijanjikan", "FEAT-07"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-1.5">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className={`mt-3 ${note}`}>Six fields. No sign of what was promised or whether it shipped.</p>
              </div>

              <div className="rounded-xl border border-line bg-background p-5">
                <p className={note}>Email I0061 · 28 Nov 2025</p>
                <h3 className="mt-1 font-display text-2xl">Re: Approval diskon 15% Kopi Lintas</h3>
                <p className={note}>Andi Wiratama to Sari Puspita</p>
                <blockquote className="mt-3 border-t border-line pt-3">
                  Disetujui 15%, pengecualian karena akun strategis dan komitmen integrasi akuntansi Q3 2026. Sampaikan ke klien
                  bahwa integrasi masuk roadmap Q3 2026. Catat di log keputusan.
                </blockquote>
                <p className={`mt-3 ${note}`}>
                  Months later the roadmap lists FEAT-07 as in development, with the 2026-Q3 target replaced by
                  &ldquo;Belum ditetapkan&rdquo;.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="entry">
          <Reveal className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[18rem_1fr] lg:gap-12">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <h2 className="font-display text-4xl leading-tight">An entry holds four answers</h2>
              <p className="mt-3 text-muted">
                Entries read like a dictionary: a headword, a definition and the sources. The reasons are quoted from the log,
                so they stay in Indonesian.
              </p>
            </div>
            <dl className="divide-y divide-line border-y border-line">
              {[
                ["The call", "Diskon 15%, disetujui. Above the 10% policy line, so it is recorded as an exception."],
                ["The reason", "Akun strategis 42 outlet; komitmen integrasi akuntansi rilis Q3 2026."],
                ["The people", "Asked by Sari Puspita, Account Manager. Decided by Andi Wiratama, VP Sales."],
                ["The proof", "Email I0061, 28 Nov 2025, subject “Re: Approval diskon 15% Kopi Lintas”."],
              ].map(([term, def]) => (
                <div key={term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                  <dt className="font-display text-2xl">{term}</dt>
                  <dd className="max-w-prose text-lg">{def}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        <section id="trace" className="border-t border-line bg-panel">
          <Reveal className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[20rem_1fr] lg:gap-12">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <h2 className="font-display text-4xl leading-tight">Follow one decision through the graph</h2>
              <p className="mt-3 text-muted">
                D-2025-11 is a 15% discount, above the 10% policy line. It was approved as an exception in exchange for a
                feature promise. The graph links the decision to the account, the deal, the email that backs it and the
                feature it promised.
              </p>
            </div>
            <ol>
              <Step rel="Keputusan" title="D-2025-11: 15% discount, approved">
                <p>
                  <strong>Pengecualian: akun strategis 42 outlet; komitmen integrasi akuntansi rilis Q3 2026.</strong>
                </p>
                <p>28 Nov 2025. Asked by Sari Puspita. Decided by Andi Wiratama.</p>
              </Step>
              <Step rel="TENTANG" title="Kopi Lintas Nusantara (C01)">
                <p>Enterprise plan, 42 outlets.</p>
              </Step>
              <Step rel="DIDASARKAN_PADA" title="Deal DL-008">
                <p>A renewal worth Rp 149.940.000 a year, won.</p>
              </Step>
              <Step rel="BERBUKTI" title="Email I0061">
                <p>
                  <strong>Re: Approval diskon 15% Kopi Lintas</strong>
                </p>
                <p>28 Nov 2025, Andi Wiratama to Sari Puspita.</p>
              </Step>
              <Step rel="MENJANJIKAN" title="Integrasi akuntansi (Jurnal & Accurate), FEAT-07">
                <p>
                  Promise status: <strong>Belum ditepati</strong>. Roadmap says in development, target moved from 2026-Q3 to
                  not set.
                </p>
              </Step>
            </ol>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-x-8 gap-y-2 px-4 py-6">
          <div>
            <Image src="/logo-wordmark.png" width={1046} height={263} alt="Decidely" className="h-7 w-auto" />
            <p className={`mt-1 max-w-prose ${note}`}>
              Built on the synthetic dataset for PT KasirNusa Teknologi from the Context Graphs hackathon. Every company,
              person and figure is fictional.
            </p>
          </div>
          <ScrollLink href="#top" className="flex min-h-11 items-center text-sm underline underline-offset-4 hover:no-underline">
            Back to top
          </ScrollLink>
        </div>
      </footer>
    </>
  );
}
