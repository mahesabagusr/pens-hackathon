"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

const isoDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function AccountDatePicker({ value, max }: { value: string; max: string }) {
  const [selected, setSelected] = useState(value);
  const [month, setMonth] = useState(Number(value.slice(5, 7)) - 1);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!container.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", key); };
  }, [open]);
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const move = (step: number) => { const next = new Date(Date.UTC(year, month + step, 1)); setMonth(next.getUTCMonth()); setYear(next.getUTCFullYear()); };
  return <div ref={container} className="account-calendar">
    <input id="asof" type="hidden" name="asof" value={selected} />
    <button ref={trigger} type="button" className="account-calendar-trigger" aria-label="Tanggal acuan" aria-expanded={open} aria-controls="account-calendar-popup" onClick={() => setOpen(!open)}>{selected.split("-").reverse().join("/")}<Icon name="calendar" className="size-4" /></button>
    {open && <div id="account-calendar-popup" className="account-calendar-popup" role="dialog" aria-label="Pilih tanggal acuan">
      <div className="account-calendar-navigation">
        <button type="button" aria-label="Bulan sebelumnya" onClick={() => move(-1)}><Icon name="chevron-right" className="size-4 rotate-180" /></button>
        <span>{months[month]} {year}</span>
        <button type="button" aria-label="Bulan berikutnya" disabled={isoDate(year, month + 1, 1) > max || (year >= Number(max.slice(0, 4)) && month >= Number(max.slice(5, 7)) - 1)} onClick={() => move(1)}><Icon name="chevron-right" className="size-4" /></button>
      </div>
      <div className="account-calendar-grid">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => <span key={day}>{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: days }, (_, i) => { const date = isoDate(year, month, i + 1); return <button key={date} type="button" aria-label={`${i + 1} ${months[month]} ${year}`} aria-pressed={selected === date} disabled={date > max} onClick={() => { setSelected(date); setOpen(false); trigger.current?.focus(); }}>{i + 1}</button>; })}
      </div>
      <p>Pilih tanggal, lalu klik Terapkan.</p>
    </div>}
  </div>;
}
