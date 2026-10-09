"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Evidence } from "~/server/discovery";
import { Icon } from "./icon";

type Sources = { records: Evidence[]; title: string };
const Context = createContext<{ selected: Sources | null; open: (sources: Sources, trigger: HTMLButtonElement) => void; close: () => void } | null>(null);
export const useSources = () => useContext(Context);

export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Sources | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = () => { setSelected(null); trigger.current?.focus(); };
  return <Context.Provider value={{ selected, open: (sources, button) => { trigger.current = button; setSelected(sources); }, close }}>{children}</Context.Provider>;
}

export function SourcePanel() {
  const sources = useSources()!;
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!sources.selected) return;
    closeButton.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); sources.close(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [sources]);
  if (!sources.selected) return null;
  return <>
    <div className="source-panel-backdrop xl:hidden" onClick={sources.close} aria-hidden />
    <aside id="source-panel" aria-label="Sumber pendukung" className="source-panel">
      <header className="source-panel-header"><div><h2>Source <span className="sidebar-count source-panel-count">{sources.selected.records.length}</span></h2><p>{sources.selected.title}</p></div><button ref={closeButton} type="button" onClick={sources.close} aria-label="Tutup sumber"><Icon name="close" /></button></header>
      <div className="source-panel-scroll" tabIndex={0} aria-label="Daftar sumber">
        {sources.selected.records.length ? sources.selected.records.map((e) => <article className="source-panel-card" key={`${e.file}:${e.row}`}><header className="source-record-header"><h3>{e.label}</h3>{e.date && <span className="source-date-label">{e.date}</span>}</header><p className="source-record-ref">{e.file} · baris {e.row}</p>{e.excerpt && <blockquote>{e.excerpt}</blockquote>}</article>) : <p className="text-sm text-muted">Tidak ada record sumber langsung untuk informasi ini.</p>}
      </div>
    </aside>
  </>;
}
