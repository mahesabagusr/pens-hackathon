"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SidebarAccount } from "./app-sidebar";
import { DATA_SET } from "./data-set-menu";
import { Icon } from "./icon";

export function ProspectPreviewTabs({ accounts }: { accounts: SidebarAccount[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const account = accounts.find((item) => item.id === params.get("q"));
  const menu = DATA_SET.find((item) => item.id === params.get("dataset"));
  const activeId = pathname === "/dashboard/decisions" ? "data:decisions" : pathname === "/dashboard" ? menu ? `data:${menu.id}` : account?.id ?? "data:crm" : null;
  const [opened, setOpened] = useState<string[]>(activeId ? [activeId] : []);
  useEffect(() => {
    if (activeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize opened tabs with menu and account navigation
      setOpened((ids) => ids.includes(activeId) ? ids : [...ids, activeId]);
    }
  }, [activeId]);
  if (!activeId) return null;
  const available = opened.includes(activeId) ? opened : [...opened, activeId];
  const visible = available.filter((id) => activeId.startsWith("data:") ? id.startsWith("data:") : !id.startsWith("data:"));
  const href = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete("dataset");
    if (id.startsWith("data:")) {
      const item = DATA_SET.find((entry) => `data:${entry.id}` === id)!;
      if (item.href) return item.href;
      next.set("dataset", item.id);
      return `/dashboard?${next}`;
    }
    next.set("q", id);
    return `/dashboard?${next}`;
  };
  const close = (id: string) => {
    const remaining = visible.filter((item) => item !== id);
    setOpened((ids) => ids.filter((item) => item !== id));
    if (id === activeId) {
      const next = remaining[Math.min(visible.indexOf(id), remaining.length - 1)];
      router.push(next ? href(next) : "/dashboard");
    }
  };
  return (
    <nav aria-label="Preview tab" className="prospect-preview-strip">
      <ul>
        {visible.map((id) => {
          const item = id.startsWith("data:") ? DATA_SET.find((entry) => `data:${entry.id}` === id) : null;
          const name = item?.label ?? accounts.find((entry) => entry.id === id)?.name;
          if (!name) return null;
          return (
            <li key={id} className={`prospect-preview-tab${id === activeId ? " is-active" : ""}`}>
              <Link href={href(id)} aria-current={id === activeId ? "page" : undefined} title={name}>
                <span className="prospect-preview-icon"><Icon name={item?.icon ?? "building"} /></span>
                <span className="prospect-preview-name">{name}</span>
              </Link>
              <button type="button" onClick={() => close(id)} aria-label={`Tutup tab ${name}`}><Icon name="close" /></button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
