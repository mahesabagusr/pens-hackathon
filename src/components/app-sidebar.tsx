"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logout } from "~/server/actions/auth";
import { AccountSwitcher } from "./account-switcher";
import { Icon, type IconName } from "./icon";

export type SidebarUser = { name: string | null; email: string };
export type SidebarAccount = { id: string; name: string; type: string };

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Discovery", icon: "compass" },
  { href: "/dashboard/decisions", label: "Log keputusan", icon: "book" },
];

const row =
  "flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm transition-colors duration-150 pointer-coarse:min-h-11";

export function AppSidebar({
  user,
  accounts,
  collapsed,
  onCollapse,
  onNavigate,
  className,
}: {
  user: SidebarUser;
  accounts: SidebarAccount[];
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate: () => void;
  className: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("q")?.trim().toUpperCase();
  const asof = params.get("asof");
  const prospects = accounts.filter((a) => a.type === "prospek");
  const look = (on: boolean) => `${row} ${on ? "bg-white/10 text-ink" : "text-muted hover:bg-white/5 hover:text-ink"} ${collapsed ? "justify-center px-0" : ""}`;

  return (
    <div id="sidebar" className={`${className} flex-col border-r border-line bg-panel`}>
      <div className={`flex h-12 shrink-0 items-center border-b border-line px-2 ${collapsed ? "justify-center" : "justify-between pl-3"}`}>
        {!collapsed && (
          <Link href="/dashboard" onClick={onNavigate} className="flex min-h-10 items-center">
            <Image src="/logo-wordmark.png" width={1046} height={263} alt="Decidely" className="h-6 w-auto" priority />
          </Link>
        )}
        <button
          type="button"
          onClick={onCollapse}
          aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          className="hidden size-9 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-ink lg:flex"
        >
          <Icon name="sidebar" className="size-4" />
        </button>
      </div>

      <nav aria-label="Navigasi dashboard" className="flex-1 space-y-5 overflow-y-auto p-2">
        {collapsed ? (
          <button type="button" onClick={onCollapse} aria-label="Cari akun" title="Cari akun" className={look(false)}>
            <Icon name="search" />
          </button>
        ) : (
          <AccountSwitcher accounts={accounts} onNavigate={onNavigate} />
        )}

        <ul className="space-y-0.5">
          {NAV.map((n) => {
            const on = pathname === n.href;
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={onNavigate}
                  aria-current={on ? "page" : undefined}
                  aria-label={collapsed ? n.label : undefined}
                  title={collapsed ? n.label : undefined}
                  className={look(on)}
                >
                  <Icon name={n.icon} />
                  {!collapsed && n.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {!collapsed && prospects.length > 0 && (
          <div>
            <h2 className="px-2.5 text-xs font-medium text-muted">Prospek</h2>
            <ul className="mt-1 space-y-0.5">
              {prospects.map((a) => {
                const on = pathname === "/dashboard" && current === a.id;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard?q=${a.id}${asof ? `&asof=${asof}` : ""}`}
                      onClick={onNavigate}
                      aria-current={on ? "page" : undefined}
                      className={look(on)}
                    >
                      <span className="font-mono text-xs text-muted">{a.id}</span>
                      <span className="truncate">{a.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-line p-2">
        {!collapsed && (
          <p className="truncate px-2.5 pb-1 text-xs text-muted" title={user.email}>
            {user.name ?? user.email}
          </p>
        )}
        <Link href="/" aria-label={collapsed ? "Halaman utama" : undefined} title={collapsed ? "Halaman utama" : undefined} className={look(false)}>
          <Icon name="home" />
          {!collapsed && "Halaman utama"}
        </Link>
        <form action={logout}>
          <button type="submit" aria-label={collapsed ? "Keluar" : undefined} title={collapsed ? "Keluar" : undefined} className={`${look(false)} w-full hover:text-danger`}>
            <Icon name="logout" />
            {!collapsed && "Keluar"}
          </button>
        </form>
      </div>
    </div>
  );
}
