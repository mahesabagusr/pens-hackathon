"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./icon";

type Option = { id: string; name: string };

export function AccountSwitcher({ accounts, onNavigate }: { accounts: Option[]; onNavigate?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const go = (q: string) => {
    const asof = params.get("asof");
    router.push(`/dashboard?q=${encodeURIComponent(q)}${asof ? `&asof=${asof}` : ""}`);
    onNavigate?.();
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        if (q) go(q);
      }}
    >
      <label htmlFor="account-q" className="px-1 text-xs text-muted">
        Cari akun
      </label>
      <div className="relative mt-1">
        <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          id="account-q"
          name="q"
          list="account-options"
          autoComplete="off"
          placeholder="P01 atau nama akun"
          // Picking a suggestion fills in an exact ID: open it straight away.
          onInput={(e) => accounts.some((a) => a.id === e.currentTarget.value) && go(e.currentTarget.value)}
          className="min-h-10 w-full rounded-md border border-line bg-background pl-8 pr-9 text-sm placeholder:text-muted pointer-coarse:min-h-11"
        />
        <button
          type="submit"
          aria-label="Buka akun"
          className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted hover:bg-white/10 hover:text-ink"
        >
          <Icon name="arrow" className="size-4" />
        </button>
      </div>
      <datalist id="account-options">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </datalist>
    </form>
  );
}
