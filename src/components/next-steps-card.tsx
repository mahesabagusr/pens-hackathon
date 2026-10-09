"use client";

import { useState } from "react";
import { InformationCard } from "./information-card";

export function NextStepsCard({ steps, owner }: { steps: string[]; owner: string | null }) {
  const [completed, setCompleted] = useState<string[]>([]);
  return (
    <InformationCard id="steps" title="Langkah berikutnya" detail={<span aria-live="polite">{completed.length}/{steps.length} selesai</span>}>
      <ul className="next-step-list">
        {steps.map((text) => (
          <li key={text} className="next-step-item">
            <label className="next-step-task">
              <input type="checkbox" aria-label={`Tandai selesai: ${text}`} className="next-step-progress" checked={completed.includes(text)} onChange={(event) => setCompleted((items) => event.target.checked ? [...items, text] : items.filter((item) => item !== text))} />
              <span className="next-step-text">{text}</span>
            </label>
            <span className="next-step-assignee" title={owner ? "Pemegang deal" : "Belum ada pekerja yang ditetapkan"}>
              <span className="next-step-avatar" aria-hidden="true">{owner ? owner.split(" ").slice(0, 2).map((part) => part[0]).join("") : "—"}</span>
              <span>{owner ?? "Belum ditetapkan"}</span>
            </span>
          </li>
        ))}
      </ul>
    </InformationCard>
  );
}
