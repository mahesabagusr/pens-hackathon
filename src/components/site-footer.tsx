import Link from "next/link";
import { ScrollLink } from "./motion";
import { Logo } from "./logo";

const link = "flex min-h-10 items-center text-sm text-muted transition-colors duration-150 hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-panel">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
        <div>
          <ScrollLink href="/#top" className="inline-flex min-h-11 items-center">
            <Logo size="lg" />
          </ScrollLink>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Every discount, exception and feature promise as a dictionary entry, linked to the deal, the email and the roadmap
            behind it.
          </p>
        </div>

        <nav aria-label="Footer, sections">
          <h2 className="text-sm font-medium">Product</h2>
          <ul className="mt-2">
            {[
              ["/#problem", "Problem"],
              ["/#entry", "Entry"],
              ["/#trace", "Trace"],
            ].map(([href, label]) => (
              <li key={href}>
                <ScrollLink href={href} className={link}>
                  {label}
                </ScrollLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer, account">
          <h2 className="text-sm font-medium">Account</h2>
          <ul className="mt-2">
            <li>
              <Link href="/login" className={link}>
                Log in
              </Link>
            </li>
            <li>
              <Link href="/register" className={link}>
                Register
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-4">
          <p className="text-sm text-muted">
            © 2026 Decidely. Demo on the synthetic KasirNusa dataset from the Context Graphs hackathon; all companies and
            people are fictional.
          </p>
          <ScrollLink href="/#top" className="flex min-h-10 items-center gap-2 text-sm text-muted transition-colors duration-150 hover:text-ink">
            Back to top
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" />
            </svg>
          </ScrollLink>
        </div>
      </div>
    </footer>
  );
}
