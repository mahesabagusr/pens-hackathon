import { InformationCard } from "./information-card";

export function NextStepsCard({ steps, owner }: { steps: string[]; owner: string | null }) {
  return (
    <InformationCard id="steps" title="Langkah berikutnya">
      <ol className="next-step-list">
        {steps.map((text, index) => (
          <li key={text} className="next-step-item">
            <div className="next-step-task">
              <span className="sidebar-count unknown-number next-step-number" aria-hidden="true">{index + 1}</span>
              <span className="next-step-text">{text}</span>
            </div>
            <span className="next-step-assignee" title={owner ? "Pemegang deal" : "Belum ada pekerja yang ditetapkan"}>
              <span className="next-step-avatar" aria-hidden="true">{owner ? owner.split(" ").slice(0, 2).map((part) => part[0]).join("") : "—"}</span>
              <span>{owner ?? "Belum ditetapkan"}</span>
            </span>
          </li>
        ))}
      </ol>
    </InformationCard>
  );
}
