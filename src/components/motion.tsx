"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HEADER = 108; // floating site header plus space above an anchored section

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
