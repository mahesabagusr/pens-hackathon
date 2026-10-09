import type { ReactNode } from "react";

export function InformationCard({ id, title, children, detail, focal = false }: { id: string; title: ReactNode; children: ReactNode; detail?: ReactNode; focal?: boolean }) {
  return (
    <section aria-labelledby={id} className={`information-card${focal ? " information-card-focal" : ""}`}>
      <header className="information-card-header">
        <h2 id={id}>{title}</h2>
        {detail && <span className="information-card-detail">{detail}</span>}
      </header>
      <div className="information-card-body">{children}</div>
    </section>
  );
}
