"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./icon";

type Option = { id: string; name: string };

export function AccountSwitcher({ accounts, onNavigate }: { accounts: Option[]; onNavigate?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const go = (q: string) => {
    const asof = params.get("asof");
    router.push(`/dashboard?q=${encodeURIComponent(q)}${asof ? `&asof=${encodeURIComponent(asof)}` : ""}`);
    onNavigate?.();
  };

  return (
    <form role="search" onSubmit={(event) => {
      event.preventDefault();
      const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
      if (q) go(q);
    }}>
      <label htmlFor="account-q" className="sr-only">Cari akun</label>
      <div className="sidebar-search">
        <Icon name="search" className="size-5 text-ink" />
        <input id="account-q" name="q" list="account-options" autoComplete="off" placeholder="Search"
          onInput={(event) => accounts.some((account) => account.id === event.currentTarget.value) && go(event.currentTarget.value)} />
      </div>
      <datalist id="account-options">
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </datalist>
    </form>
  );
}
