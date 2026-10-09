import Link from "next/link";
import { Reveal, ScrollLink } from "./motion";

// The public landing page. Every product view below is drawn from the real KasirNusa dataset (P01, P03, email I0343,
// D-2025-11), the same records the dashboard shows; nothing is invented for the page.
// Motif: numbered [01] labels and product views on a softly lit stage, the accent green used only for status and labels.

const solid =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-ink px-6 font-medium text-background transition-opacity duration-150 hover:opacity-90";
const subdued =
  "inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-white/[0.03] px-6 font-medium transition-colors duration-150 hover:border-white/50";
const chip =
  "inline-flex items-center rounded border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-muted";

function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-[13px] text-muted">
      <span className="text-accent">[{n}]</span> {children}
    </p>
  );
}

// A lit stage behind a product view: the faint green glow from the top makes the product the focal object of its section.
function Stage({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-line bg-panel bg-[radial-gradient(120%_70%_at_50%_0%,#00c75814,transparent_65%)] p-3 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// The dashboard as a window: a quiet title bar naming the account, no fake browser controls.
function Window({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#0e0e11] shadow-[0_30px_80px_-30px_#000]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-muted">
        <span className="font-mono">decidely</span>
        <span aria-hidden>/</span>
        <span className="truncate">{title}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span
        className={`size-2.5 shrink-0 rounded-[2px] ${ok ? "bg-accent" : "border border-dashed border-muted"}`}
        aria-hidden
      />
      {children}
    </p>
  );
}

function AnswerCard() {
  return (
    <article className="rounded-xl border border-line bg-panel p-5">
      <p className="text-xs text-muted">Pemutus pengadaan · per 1 Okt 2026</p>
      <div className="mt-2">
        <Status ok>Teridentifikasi lintas sumber</Status>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Rina Hapsari
      </p>
      <p className="text-muted">GM Operations · Grup Ritel Mandala</p>
      <p className="mt-4 max-w-prose text-sm leading-relaxed">
        Email I0343 menyebut keputusan pengadaan ada di GM Operations yang baru
        bergabung. Riwayat jabatan: Rina satu-satunya GM Operations di akun ini
        sejak 1 Sep 2026.
      </p>
      <p className="mt-3 flex flex-wrap gap-1.5">
        <span className={chip}>interactions.jsonl:343</span>
        <span className={chip}>contact_employment_history.csv:24</span>
      </p>
    </article>
  );
}

function CallPlanCard({ compact = false }: { compact?: boolean }) {
  const rows: [string, string, string, string][] = [
    [
      "1",
      "Rina Hapsari",
      "Pemutus pengadaan",
      "Lewat Fajar Nugraha, yang menyebutnya di email I0343",
    ],
    [
      "2",
      "Fajar Nugraha",
      "Penilai teknis",
      "Langsung, terakhir email I0343 (24 Sep 2026)",
    ],
  ];
  return (
    <article className="rounded-xl border border-line bg-panel p-5">
      <p className="font-medium">Siapa yang dihubungi</p>
      <p className="text-xs text-muted">Yang menghubungi: Bagus Prakoso</p>
      <ol className="mt-3 divide-y divide-line">
        {rows.map(([n, name, role, route]) => (
          <li key={n} className="grid grid-cols-[1.5rem_1fr] gap-x-2 py-3">
            <span
              className="text-lg leading-6 tabular-nums text-muted"
              aria-hidden
            >
              {n}
            </span>
            <div className="min-w-0">
              <p>
                <span className="font-medium">{name}</span>{" "}
                <span className="text-sm text-muted">· {role}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted">{route}</p>
              {!compact && n === "1" && (
                <p className="mt-2 rounded-md border border-line bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="text-muted">Siapkan: </span>janji D-2025-11
                  (integrasi akuntansi, FEAT-07) belum ditepati. Ia membahas
                  fitur ini langsung dengan KasirNusa saat di Kopi Lintas
                  Nusantara.
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!compact && (
        <p className="border-t border-line pt-3 text-sm text-muted">
          Belum perlu dihubungi langsung: Steven Wijaya (Direktur Utama),
          tanyakan ke Rina dulu.
        </p>
      )}
    </article>
  );
}

// The evidence path for P01 as a small graph. Dashed = read from an email's text, solid = a record.
const NODES = [
  { id: "email", x: 8, y: 34, title: "Email I0343", kind: "Interaksi" },
  {
    id: "rina",
    x: 218,
    y: 34,
    title: "Rina Hapsari",
    kind: "Kontak",
    focus: true,
  },
  { id: "p01", x: 428, y: 34, title: "Grup Ritel Mandala", kind: "Akun P01" },
  {
    id: "c01",
    x: 218,
    y: 154,
    title: "Kopi Lintas Nusantara",
    kind: "Akun lama",
  },
  { id: "dec", x: 428, y: 154, title: "D-2025-11", kind: "Keputusan" },
  {
    id: "feat",
    x: 428,
    y: 254,
    title: "FEAT-07",
    kind: "Janji belum ditepati",
  },
] as const;
const EDGES: [from: string, to: string, label: string, dashed: boolean][] = [
  ["email", "rina", "MENYEBUT (peran)", true],
  ["rina", "p01", "BEKERJA_DI", false],
  ["rina", "c01", "PERNAH_BEKERJA_DI", false],
  ["dec", "c01", "TENTANG", false],
  ["dec", "feat", "MENJANJIKAN", false],
];
const W = 164;
const H = 46;

function EvidenceGraph() {
  const at = (id: string) => NODES.find((n) => n.id === id)!;
  return (
    <svg
      viewBox="0 0 600 310"
      className="h-auto w-full"
      role="img"
      aria-labelledby="graph-title"
    >
      <title id="graph-title">
        Jalur bukti P01: email I0343 menyebut peran yang cocok dengan Rina
        Hapsari, yang bekerja di Grup Ritel Mandala dan pernah bekerja di Kopi
        Lintas Nusantara, tempat keputusan D-2025-11 menjanjikan FEAT-07.
      </title>
      {EDGES.map(([from, to, label, dashed]) => {
        const a = at(from);
        const b = at(to);
        const sameRow = a.y === b.y;
        const x1 = sameRow ? a.x + (a.x < b.x ? W : 0) : a.x + W / 2;
        const y1 = sameRow ? a.y + H / 2 : a.y + (a.y < b.y ? H : 0);
        const x2 = sameRow ? b.x + (a.x < b.x ? 0 : W) : b.x + W / 2;
        const y2 = sameRow ? b.y + H / 2 : b.y + (a.y < b.y ? 0 : H);
        const horizontal = Math.abs(y2 - y1) < 1;
        return (
          <g key={`${from}-${to}`}>
            <path
              d={`M${x1},${y1} L${x2},${y2}`}
              stroke={dashed ? "#00c758" : "#a1a1aa"}
              strokeOpacity={dashed ? 1 : 0.6}
              strokeWidth={1.5}
              strokeDasharray={dashed ? "5 4" : undefined}
              fill="none"
            />
            {/* Horizontal labels sit above the row of boxes, so a narrow gap never hides them. */}
            <text
              x={(x1 + x2) / 2 + (horizontal ? 0 : 6)}
              y={horizontal ? Math.min(a.y, b.y) - 8 : (y1 + y2) / 2 + 4}
              textAnchor={horizontal ? "middle" : "start"}
              className="fill-[#a1a1aa] font-mono"
              fontSize="9.5"
            >
              {label}
            </text>
          </g>
        );
      })}
      {NODES.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x}
            y={n.y}
            width={W}
            height={H}
            rx="8"
            fill="#131316"
            stroke={
              "focus" in n
                ? "#ffffff"
                : n.id === "feat"
                  ? "#f59e0b"
                  : "#ffffff3d"
            }
            strokeWidth={"focus" in n ? 1.5 : 1}
          />
          <text
            x={n.x + 12}
            y={n.y + 20}
            className="fill-white"
            fontSize="12.5"
          >
            {n.title}
          </text>
          <text
            x={n.x + 12}
            y={n.y + 36}
            className="fill-[#a1a1aa]"
            fontSize="10.5"
          >
            {n.kind}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SourceCard() {
  return (
    <article className="rounded-xl border border-line bg-panel p-4">
      <p className="font-medium">Email I0343</p>
      <p className="mt-0.5 font-mono text-[11px] text-muted">
        interactions.jsonl:343 · isi · 2026-09-24
      </p>
      <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm leading-relaxed text-muted">
        &ldquo;…Keputusan pengadaan sistem kasir ada di beliau, saya hanya
        menilai sisi teknis.&rdquo;
      </blockquote>
    </article>
  );
}

function ChatCard() {
  return (
    <article className="rounded-xl border border-line bg-panel p-5">
      <p className="ml-auto w-fit rounded-xl rounded-br-sm bg-white/[0.07] px-3.5 py-2 text-sm">
        Siapa pemutus di P01?
      </p>
      <p className="mt-4 text-sm leading-relaxed">
        Pemutus pengadaan di P01 (Grup Ritel Mandala) adalah Rina Hapsari
        (K017), GM Operations sejak 1 Sep 2026. Dasarnya email I0343 dari Fajar
        Nugraha: keputusan pengadaan ada di GM Operations yang baru bergabung.
      </p>
      <p className="mt-3 flex flex-wrap gap-1.5">
        {["P01", "K017", "I0343", "K052"].map((id) => (
          <span key={id} className={chip}>
            {id}
          </span>
        ))}
      </p>
      <p className="mt-3 text-xs text-muted">
        Diperiksa Jev: isi jawaban didukung hasil query.
      </p>
    </article>
  );
}

export function LandingPage() {
  return (
    <main id="top">
      {/* Hero: the question every rep asks, then the product answering it for a real account. */}
      <section className="mx-auto max-w-6xl px-4 pt-16 text-center sm:pt-24">
        <Reveal>
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Know who decides before you make the call.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Decidely reads the CRM, emails and meeting notes, finds the person
            who actually decides the purchase, and shows the record behind every
            claim.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard?q=P01" className={solid}>
              Open the P01 demo
            </Link>
            <ScrollLink href="/#decide" className={subdued}>
              See how it works
            </ScrollLink>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 text-left sm:mt-16">
          <Stage>
            <Window title="P01 · Grup Ritel Mandala">
              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <AnswerCard />
                <CallPlanCard compact />
              </div>
            </Window>
          </Stage>
        </Reveal>
      </section>

      {/* [01] Who decides: the identified case and the honest "not yet" case side by side. */}
      <section id="decide" className="mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
        <Reveal className="grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14">
          <div>
            <Label n="01">Who decides</Label>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              Finds the decision maker, or says it can&apos;t.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              An email that says &ldquo;the decision is hers&rdquo; is not
              enough. The role it names is matched against employment history on
              the date it was written before anyone is called the decision
              maker.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              When the sources don&apos;t point to one person, the answer stays
              open and tells you who to ask instead.
            </p>
          </div>
          <Stage>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-line bg-panel p-4">
                <p className="text-xs text-muted">P01 · Grup Ritel Mandala</p>
                <div className="mt-2">
                  <Status ok>Teridentifikasi lintas sumber</Status>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  Rina Hapsari
                </p>
                <p className="text-sm text-muted">GM Operations</p>
                <p className="mt-3 text-sm leading-relaxed">
                  Email I0343 plus riwayat jabatan sejak 1 Sep 2026.
                </p>
              </article>
              <article className="rounded-xl border border-line bg-panel p-4">
                <p className="text-xs text-muted">
                  P03 · Klinik Pratama Medika
                </p>
                <div className="mt-2">
                  <Status ok={false}>Belum teridentifikasi</Status>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-muted">
                  Belum ada nama
                </p>
                <p className="text-sm text-muted">
                  Tidak ada sumber yang menyebut pemutus
                </p>
                <p className="mt-3 text-sm leading-relaxed">
                  Tanyakan ke Ratna Dewi (Kepala Apotek) siapa yang menyetujui
                  anggaran.
                </p>
              </article>
            </div>
          </Stage>
        </Reveal>
      </section>

      {/* [02] The evidence path: product view first on wide screens, so the sections alternate. */}
      <section id="evidence" className="mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
        <Reveal className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-14">
          <div className="lg:order-2">
            <Label n="02">Evidence path</Label>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              Every answer is a path you can walk.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              The email, the person, the account and the decision log are linked
              in one context graph. Open any node and you get the record behind
              it: file, row and date.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Dashed lines are read from what someone wrote. Solid lines are
              records. You always know which is which.
            </p>
          </div>
          <Stage className="lg:order-1">
            <div className="rounded-xl border border-line bg-[#0e0e11] p-3 sm:p-4">
              <div className="hidden sm:block">
                <EvidenceGraph />
              </div>
              <ol className="space-y-2 text-sm sm:hidden">
                <li>Email I0343 menyebut peran → Rina Hapsari</li>
                <li>Rina Hapsari bekerja di → Grup Ritel Mandala</li>
                <li>Rina Hapsari pernah bekerja di → Kopi Lintas Nusantara</li>
                <li>D-2025-11 menjanjikan → FEAT-07 (belum ditepati)</li>
              </ol>
            </div>
            <div className="mt-3">
              <SourceCard />
            </div>
          </Stage>
        </Reveal>
      </section>

      {/* [03] Who to call: the contact plan, the step from knowing to acting. */}
      <section id="contact" className="mx-auto max-w-6xl px-4 pt-28 sm:pt-36">
        <Reveal className="grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14">
          <div>
            <Label n="03">Who to call</Label>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              A call plan, not just a name.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Who to contact first, through whom, what to ask and what to
              prepare. Warm introductions come from people who already spoke
              with KasirNusa.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              History that matters comes along: Rina was promised an accounting
              integration at her previous company, and it never shipped. Better
              to hear that before the meeting than in it.
            </p>
          </div>
          <Stage>
            <CallPlanCard />
          </Stage>
        </Reveal>
      </section>

      {/* The contrasting band: what makes the answers trustworthy. Lighter surface, full width, so it reads as a pause. */}
      <section
        id="sources"
        className="mt-28 border-y border-line bg-panel sm:mt-36"
      >
        <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-[6fr_5fr] lg:gap-14 sm:py-24">
          <div>
            <Label n="04">Sources</Label>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              Every claim points to its source.
            </h2>
            <dl className="mt-8 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
              {[
                [
                  "Rules decide, models read",
                  "Statuses like “teridentifikasi” come from fixed evidence rules. Models only read text and explain.",
                ],
                [
                  "Click through to the row",
                  "Every card names its file, row and date, so a claim can be checked in seconds.",
                ],
                [
                  "Answers checked against data",
                  "The chat can have Jev check that each fact in an answer appears in the query results.",
                ],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt className="font-medium">{term}</dt>
                  <dd className="mt-1 leading-relaxed text-muted">{def}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ChatCard />
        </Reveal>
      </section>

      {/* Closing call to action. */}
      <section className="mx-auto max-w-6xl px-4 py-28 text-center sm:py-36">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Start with P01.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted">
            Log in and open Grup Ritel Mandala. The decision maker, the evidence
            path and the call plan are already there.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard?q=P01" className={solid}>
              Open the dashboard
            </Link>
            <Link href="/register" className={subdued}>
              Create an account
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
