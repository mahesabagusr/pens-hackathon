"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "~/server/actions/auth";
import { Icon } from "./icon";
import { ScrollLink } from "./motion";
import { Logo } from "./logo";

const SECTIONS: [string, string][] = [
  ["decide", "Who decides"],
  ["evidence", "Evidence"],
  ["contact", "Who to call"],
  ["sources", "Sources"],
];

type NavUser = { name: string | null; email: string };

const ghost =
  "flex min-h-10 items-center justify-center whitespace-nowrap rounded-md border border-line px-4 text-sm font-medium transition-colors duration-150 hover:border-ink";
const solid =
  "flex min-h-10 items-center justify-center whitespace-nowrap rounded-md bg-ink px-4 text-sm font-medium text-background transition-opacity duration-150 hover:opacity-90";
const plain = "flex min-h-10 items-center px-3 text-sm text-muted transition-colors duration-150 hover:text-ink";

// Same avatar as the dashboard's profile block (.sidebar-profile-avatar), smaller for the navbar.
const smallAvatar =
  "grid size-7 shrink-0 place-items-center rounded-[8px] border border-[#a6efc820] bg-[#18372a] text-sm font-medium text-[#b4edc7]";

// Name, email and the two account actions, as rows in the dashboard's .sidebar-row style.
function ProfilePanel({ user, onNavigate }: { user: NavUser; onNavigate?: () => void }) {
  const name = user.name ?? user.email;
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="sidebar-profile-avatar" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>
      <div className="my-1 border-t border-line" />
      <Link href="/dashboard" onClick={onNavigate} className="sidebar-row">
        <Icon name="compass" className="size-4" /> Dashboard
      </Link>
      <form action={logout} onSubmit={onNavigate}>
        <button type="submit" className="sidebar-row">
          <Icon name="logout" className="size-4" /> Log out
        </button>
      </form>
    </>
  );
}

// The signed-in navbar: one profile button that opens Dashboard and Log out, like the dashboard's profile block.
// A disclosure (button + panel of links), so Tab and Enter work as usual; Escape and a click outside close it.
function ProfileMenu({ user }: { user: NavUser }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const name = user.name ?? user.email;

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div
      ref={wrap}
      className="relative"
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="profile-menu"
        title={user.email}
        className="nav-profile-button flex min-h-10 cursor-pointer items-center gap-2 rounded-lg pl-1.5 pr-2.5 text-sm transition-colors duration-150 hover:bg-white/5"
      >
        <span className={smallAvatar} aria-hidden>
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate xl:block">{name}</span>
        <span className="sr-only xl:hidden">Profil {name}</span>
        <Icon name="chevron-right" className={`size-3.5 text-muted transition-transform duration-150 ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="profile-menu"
            className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-line bg-panel p-1.5 shadow-[0_16px_40px_-12px_#000000cc]"
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <ProfilePanel user={user} onNavigate={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuthLinks({ user, onNavigate, stacked }: { user?: NavUser | null; onNavigate?: () => void; stacked?: boolean }) {
  if (user === undefined) return null; // session still loading, show nothing rather than the wrong buttons
  if (user) {
    // The mobile drawer is already a menu: show the profile panel inline instead of a second dropdown.
    return stacked ? (
      <div>
        <ProfilePanel user={user} onNavigate={onNavigate} />
      </div>
    ) : (
      <ProfileMenu user={user} />
    );
  }
  const row = stacked ? "flex flex-col gap-2" : "flex items-center gap-1";
  return (
    <div className={row}>
      <Link href="/login" onClick={onNavigate} className={stacked ? ghost : plain}>
        Log in
      </Link>
      <Link href="/register" onClick={onNavigate} className={solid}>
        Register
      </Link>
    </div>
  );
}

// user: a user, null for a guest, undefined while the session loads.
export function Nav({ user }: { user?: NavUser | null }) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        setActive(SECTIONS.map(([id]) => id).findLast((id) => seen.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const [id] of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const spring = reduced ? { duration: 0 } : ({ type: "spring", stiffness: 500, damping: 40 } as const);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-2 md:grid-cols-[1fr_auto_1fr]">
        <ScrollLink href="/#top" className="flex min-h-11 items-center justify-self-start">
          <Logo size="lg" priority />
        </ScrollLink>

        <nav aria-label="Sections" className="hidden items-center gap-1 text-sm md:flex">
          {SECTIONS.map(([id, label]) => (
            <ScrollLink
              key={id}
              href={`/#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={`relative flex min-h-11 items-center whitespace-nowrap rounded-md px-3 transition-colors duration-150 hover:text-ink ${
                active === id ? "text-ink" : "text-muted"
              }`}
            >
              {active === id && (
                <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-line" transition={spring} aria-hidden>
                  <span className="absolute inset-x-4 bottom-1 h-0.5 bg-accent" />
                </motion.span>
              )}
              <span className="relative">{label}</span>
            </ScrollLink>
          ))}
        </nav>

        <div className="hidden justify-self-end md:block">
          <AuthLinks user={user} />
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center justify-self-end rounded-md border border-line hover:border-ink md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="absolute inset-x-0 top-full border-b border-line bg-background md:hidden"
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
              <nav aria-label="Sections, mobile" className="flex flex-col divide-y divide-line border-y border-line">
                {SECTIONS.map(([id, label]) => (
                  <ScrollLink
                    key={id}
                    href={`/#${id}`}
                    onClick={() => setOpen(false)}
                    aria-current={active === id ? "location" : undefined}
                    className={`flex min-h-12 items-center justify-between ${active === id ? "text-ink" : "text-muted"}`}
                  >
                    {label}
                    {active === id && <span className="size-2 rounded-[2px] bg-accent" aria-hidden />}
                  </ScrollLink>
                ))}
              </nav>
              <AuthLinks user={user} onNavigate={() => setOpen(false)} stacked />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent"
        style={{ scaleX: reduced ? scrollYProgress : scaleX }}
      />
    </header>
  );
}

