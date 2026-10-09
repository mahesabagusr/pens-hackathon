import Link from "next/link";
import { tanggal, type ContactEntry, type Discovery } from "~/server/discovery";
import { AskButton } from "./chat";
import { Icon } from "./icon";
import { SourceLabel } from "./source-label";

// "Siapa yang dihubungi" (PRD_CONTACT_PLAN.md): who Sales contacts first, through whom, and what to bring.
// The Stakeholder tab's focal card, so it carries the tab's one shadow-bubble.
const action =
  "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 text-xs transition-colors duration-150 hover:border-white/50 pointer-coarse:min-h-11";

export function ContactPlanCard({ d }: { d: Discovery }) {
  const plan = d.contacts;
  const person = (id: string) => d.people.find((p) => p.id === id)!;
  return (
    <section aria-labelledby="contact-plan" className="information-card information-card-focal contact-plan">
      <header className="information-card-header contact-plan-header">
        <div>
          <h2 id="contact-plan">Siapa yang dihubungi</h2>
          <p className="text-xs text-muted">Disusun dari bukti yang tersedia sampai tanggal berikut.</p>
        </div>
        <div className="contact-plan-meta">
          <span className="information-card-detail">{tanggal(d.asOf)}</span>
          {plan.owner && <span className="contact-owner" aria-label={`Yang menghubungi: ${plan.owner}`}><span className="next-step-avatar" aria-hidden>{plan.owner.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>{plan.owner}</span>}
        </div>
      </header>
      <div className="information-card-body">

        {plan.entries.length ? (
          <ol className="mt-3 divide-y divide-line">
            {plan.entries.map((e) => (
              <Entry key={e.personId} e={e} name={person(e.personId).name} title={person(e.personId).title} d={d} />
            ))}
          </ol>
        ) : (
          <p className="mt-3 max-w-prose leading-relaxed">
            {d.people.length
              ? `Belum ada kontak di ${d.account.name} yang sudah berbicara dengan KasirNusa sampai ${tanggal(d.asOf)}.`
              : `Belum ada kontak tercatat di ${d.account.name} sampai ${tanggal(d.asOf)}.`}{" "}
            {plan.owner ?? "Sales"} mulai lewat pemegang akun.
          </p>
        )}

        {plan.notYet.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="text-sm font-medium">Belum perlu dihubungi langsung</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {plan.notYet.map((n) => (
                <li key={n.personId} className="leading-relaxed">
                  <span className="font-medium">{person(n.personId).name}</span> <span className="text-muted">({person(n.personId).title})</span>: {n.reason} <SourceLabel evidence={d.evidence} ids={n.evidence} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Entry({ e, name, title, d }: { e: ContactEntry; name: string; title: string; d: Discovery }) {
  const last = !e.last
    ? "Belum pernah dihubungi KasirNusa."
    : e.last.accountId === d.account.id
      ? `${tanggal(e.last.date)}, ${e.last.ref}.`
      : `Belum pernah di akun ini; terakhir dengan KasirNusa ${tanggal(e.last.date)}, ${e.last.ref}, saat di ${e.last.accountName ?? e.last.accountId}.`;
  return (
    <li className="grid gap-x-4 py-4 first:pt-2 sm:grid-cols-[2rem_1fr]">
      <span className="sidebar-count unknown-number contact-rank" aria-hidden>
        {e.rank}
      </span>
      <div className="min-w-0">
        <div className="contact-person-heading"><span className="font-medium text-white">{name}</span><span className="contact-role">{e.role.split(" · ")[0]}</span></div>
        <p className="text-xs text-muted">{title}</p>

        <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <Row label="Mengapa" d={d} ids={e.evidence}>{e.why}</Row>
          <Row label="Cara menghubungi" d={d} ids={e.routes.flatMap((r) => r.evidence)}>
            {e.routes.length ? (
              <ul className="space-y-1">
                {e.routes.map((r, i) => (
                  <li key={i}>{r.note}</li>
                ))}
              </ul>
            ) : (
              "Belum ada jalur perkenalan di data; hubungi lewat kontak discovery."
            )}
          </Row>
          <Row label="Yang ditanyakan" d={d} ids={e.evidence}>{e.ask}</Row>
          {e.prepare.length > 0 && (
            <Row label="Siapkan" d={d} ids={e.prepare.flatMap((p) => p.evidence)}>
              <ul className="space-y-1">
                {e.prepare.map((p, i) => (
                  <li key={i}>{p.text}</li>
                ))}
              </ul>
            </Row>
          )}
          <Row label="Kontak terakhir" d={d} ids={e.last ? d.evidence.filter((v) => v.label.includes(e.last!.interactionId)).map((v) => v.id) : []}>{last}</Row>
        </dl>

        <div className="mt-3 flex flex-wrap gap-2">
          {e.email && (
            <a href={`mailto:${e.email}`} className={action} aria-label={`Email ${name} (${e.email}, dari CRM)`}>
              Email
            </a>
          )}
          <Link href={`/dashboard?q=${d.account.id}&asof=${d.asOf}&tab=graph&focus=${e.personId}`} className={action} aria-label={`Lihat ${name} di Jalur bukti`}>
            <Icon name="graph" className="size-3.5" /> Lihat di Jalur bukti
          </Link>
          <AskButton
            question={`Bagaimana sebaiknya ${d.contacts.owner ?? "Sales"} menghubungi ${name} (${title}) di ${d.account.name}, dan apa yang perlu disiapkan?`}
            className={`${action} evidence-ask-button`}
          >
            <Icon name="chat" className="size-3.5" /> Tanya AI
          </AskButton>
        </div>
      </div>
    </li>
  );
}

function Row({ label, children, d, ids }: { label: string; children: React.ReactNode; d: Discovery; ids: string[] }) {
  return (
    <>
      <dt className="text-xs text-muted sm:pt-0.5">{label}</dt>
      <dd className="contact-explanation">{children}<SourceLabel evidence={d.evidence} ids={ids} title={label} /></dd>
    </>
  );
}
