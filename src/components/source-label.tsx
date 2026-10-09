"use client";

import type { Evidence } from "~/server/discovery";
import { Icon } from "./icon";
import { useSources } from "./source-provider";
import { useChat } from "./chat-provider";

export function SourceLabel({ evidence, ids, title = "Sumber pendukung informasi", className = "" }: { evidence: Evidence[]; ids: string[]; title?: string; className?: string }) {
  const sources = useSources();
  const chat = useChat();
  const selected = evidence.filter((e) => ids.includes(e.id));
  const records = [...new Map(selected.map((e) => [`${e.file}:${e.row}`, e])).values()];
  const active = sources?.selected?.title === title && sources.selected.records.map((e) => e.id).join(",") === records.map((e) => e.id).join(",");
  return <button type="button" className={`contact-source source-trigger ${className}`} aria-label={`${records.length} sumber pendukung: ${title}`} aria-controls="source-panel" aria-expanded={active} onClick={(event) => { if (active) sources?.close(); else { chat?.close(); sources?.open({ records, title }, event.currentTarget); } }}>
    Source <span className="contact-source-count">{records.length}</span><Icon name="chevron-right" className="size-3.5" />
  </button>;
}
