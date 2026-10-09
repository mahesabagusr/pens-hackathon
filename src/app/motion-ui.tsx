"use client";

import { AnimatePresence, animate, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "./auth/actions";

const HEADER = 80; // sticky header plus breathing room, same as scroll-padding-top in globals.css
const SECTIONS: [string, string][] = [
  ["problem", "Problem"],
  ["entry", "Entry"],
  ["trace", "Trace"],
];

let running: ReturnType<typeof animate> | undefined;

// Eased scroll to an anchor. The user can interrupt it with the wheel, touch or keyboard.
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const from = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = id === "top" ? 0 : Math.min(Math.max(el.getBoundingClientRect().top + from - HEADER, 0), max);
  running?.stop();
  const stop = () => running?.stop();
  for (const ev of ["wheel", "touchstart", "keydown"]) window.addEventListener(ev, stop, { once: true, passive: true });
  running = animate(from, to, {
    duration: Math.min(0.9, Math.max(0.45, Math.abs(to - from) / 2500)),
    ease: [0.22, 1, 0.36, 1],
    onUpdate: (v) => window.scrollTo({ top: v, behavior: "instant" }),
    onComplete: () => history.replaceState(null, "", `#${id}`),
  });
}

// href is "/#section". On the home page it eases to the section; elsewhere it navigates home and the browser jumps there.
export function ScrollLink({ href, children, onClick, ...rest }: { href: string } & React.ComponentProps<"a">) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  return (
    <Link
      {...rest}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (pathname !== "/" || reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        scrollToId(href.split("#")[1] ?? "top");
      }}
    >
      {children}
    </Link>
  );
}

type NavUser = { name: string | null; email: string };

const ghost =
  "flex min-h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-medium transition-colors duration-150 hover:border-ink";
const plain = "flex min-h-10 items-center px-3 text-sm text-muted transition-colors duration-150 hover:text-ink";

function AuthLinks({ user, onNavigate, stacked }: { user?: NavUser | null; onNavigate?: () => void; stacked?: boolean }) {
  if (user === undefined) return null; // session still loading, show nothing rather than the wrong buttons
  const row = stacked ? "flex flex-col gap-2" : "flex items-center gap-1";
  if (user) {
    return (
      <div className={row}>
        <span className={`${stacked ? "px-1 py-2" : "max-w-40 truncate px-3"} text-sm text-muted`} title={user.email}>
          {user.name ?? user.email}
        </span>
        <form action={logout} onSubmit={onNavigate}>
          <button type="submit" className={`${ghost} ${stacked ? "w-full" : ""}`}>
            Log out
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className={row}>
      <Link href="/login" onClick={onNavigate} className={stacked ? ghost : plain}>
        Log in
      </Link>
      <Link href="/register" onClick={onNavigate} className={ghost}>
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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <ScrollLink href="/#top" className="flex min-h-11 items-center">
          <Image src="/logo-wordmark.png" width={1046} height={263} alt="Decidely" priority className="h-7 w-auto" />
        </ScrollLink>

        <div className="hidden items-center gap-4 md:flex">
          <nav aria-label="Sections" className="flex gap-1 text-sm">
            {SECTIONS.map(([id, label]) => (
              <ScrollLink
                key={id}
                href={`/#${id}`}
                aria-current={active === id ? "location" : undefined}
                className={`relative flex min-h-11 items-center px-3 transition-colors duration-150 hover:text-ink ${
                  active === id ? "text-ink" : "text-muted"
                }`}
              >
                {label}
                {active === id && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 bottom-1 h-0.5 bg-accent"
                    transition={spring}
                    aria-hidden
                  />
                )}
              </ScrollLink>
            ))}
          </nav>
          <span className="h-6 w-px bg-line" aria-hidden />
          <AuthLinks user={user} />
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-md border border-line hover:border-ink md:hidden"
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

// Fades and lifts a block in once it scrolls into view. Plain div when the user prefers reduced motion.
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
