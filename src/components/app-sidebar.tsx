"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logout } from "~/server/actions/auth";
import { AccountSwitcher } from "./account-switcher";
import { Icon } from "./icon";
import { DATA_SET } from "./data-set-menu";

export type SidebarUser = { name: string | null; email: string };
export type SidebarAccount = { id: string; name: string; type: string };

export function AppSidebar({ user, accounts, collapsed, onCollapse, onNavigate, className }: {
  user: SidebarUser;
  accounts: SidebarAccount[];
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate: () => void;
  className: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("q")?.trim().toUpperCase();
  const asof = params.get("asof");
  const prospects = accounts.filter((a) => a.type === "prospek");
  const previewMenu = params.get("dataset");
  const navigate = onNavigate;
  const displayName = user.name ?? user.email;

  return (
    <aside id="sidebar" aria-label="Sidebar" data-collapsed={collapsed} className={`${className} decidely-sidebar flex-col`}>
      <div className="sidebar-brand">
        {!collapsed && (
          <Link href="/dashboard" onClick={navigate} className="sidebar-wordmark">
            <Image src="/logo-wordmark.png" width={1046} height={263} alt="Decidely" className="h-7 w-auto" priority />
          </Link>
        )}
        <button type="button" onClick={onCollapse} aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          aria-expanded={!collapsed} title={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} className="sidebar-collapse hidden lg:flex">
          <Icon name="sidebar" className="size-5" />
        </button>
      </div>

      <nav aria-label="Navigasi dashboard" className="sidebar-navigation relative">
        <div className="sidebar-search-slot">
          {collapsed ? (
            <button type="button" onClick={onCollapse} aria-label="Cari akun" title="Cari akun" className="sidebar-row">
              <Icon name="search" />
            </button>
          ) : <AccountSwitcher accounts={accounts} onNavigate={navigate} />}
        </div>

        <section aria-label="Data Set" className="sidebar-section">
          {!collapsed && <div className="sidebar-section-heading"><h2>Data Set</h2><span className="sidebar-section-dots" aria-hidden><Icon name="more-vertical" /></span></div>}
          <ul className="sidebar-menu">
            {DATA_SET.map((item) => {
              const active = previewMenu ? previewMenu === item.id : pathname === item.href && !(item.label === "CRM" && current);
              const content = <><Icon name={item.icon} />{!collapsed && <><span className="sidebar-data-label"><span>{item.label}</span>{item.fresh && <span className="sidebar-new">New</span>}</span></>}</>;
              const style = `sidebar-row ${active ? "is-active" : ""}`;
              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link href={item.href} onClick={navigate} aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} className={style}>{content}</Link>
                  ) : (
                    <button type="button" onClick={() => { const next = new URLSearchParams(params.toString()); next.set("dataset", item.id); router.push(`/dashboard?${next}`); onNavigate(); }} aria-pressed={active}
                      aria-label={collapsed ? `${item.label}${item.fresh ? " — New" : ""}` : undefined} title={collapsed ? item.label : undefined} className={style}>{content}</button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Prospect Management" className="sidebar-section sidebar-prospects">
          {!collapsed && <div className="sidebar-section-heading"><h2>Prospect Management</h2><span className="sidebar-count" aria-label={`${prospects.length} prospects`}>{prospects.length}</span></div>}
          <ul className="sidebar-menu">
            {prospects.map((account) => {
              const active = !previewMenu && pathname === "/dashboard" && current === account.id;
              return (
                <li key={account.id}>
                  <Link href={`/dashboard?q=${encodeURIComponent(account.id)}${asof ? `&asof=${encodeURIComponent(asof)}` : ""}`}
                    onClick={navigate} aria-current={active ? "page" : undefined} aria-label={collapsed ? account.name : undefined}
                    title={account.name} className={`sidebar-row sidebar-prospect ${active ? "is-active" : ""}`}>
                    <Icon name="building" />
                    {!collapsed && <><span className="sidebar-label truncate">{account.name}</span><span className="sidebar-prospect-id">{account.id}</span></>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile">
          <span className="sidebar-profile-avatar" aria-hidden>{displayName.charAt(0).toUpperCase()}</span>
          {!collapsed && <div className="sidebar-profile-details min-w-0" title={user.email}><p className="truncate">{displayName}</p><span className="block truncate">{user.email}</span></div>}
          <form action={logout}>
            <button type="submit" aria-label="Keluar" title="Keluar" className="sidebar-logout-button">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
