import Link from "next/link";
import { ScrollLink } from "./motion";
import { Logo } from "./logo";
import { Icon } from "./icon";
import styles from "./marketing-shell.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div><ScrollLink href="/#top" className="inline-flex min-h-11 items-center"><Logo size="lg" /></ScrollLink><p>Know who decides, follow the evidence, and prepare your next conversation.</p></div>
        <nav aria-label="Footer, product"><h2>Product</h2><ul>{[["/#problem", "Why Decidely"], ["/#entry", "Account workspace"], ["/#trace", "How it works"], ["/#faq", "FAQs"]].map(([href, label]) => <li key={href}><ScrollLink href={href}>{label}</ScrollLink></li>)}</ul></nav>
        <nav aria-label="Footer, account"><h2>Explore Decidely</h2><ul><li><Link href="/dashboard?q=P01&asof=2026-10-01">Open the demo</Link></li><li><Link href="/login">Log in</Link></li><li><Link href="/register">Create an account</Link></li></ul></nav>
      </div>
      <div className={styles.footerBottom}><p>© 2026 Decidely. Prototype using synthetic KasirNusa data. All companies and people are fictional.</p><ScrollLink href="/#top">Back to top<Icon name="arrow" /></ScrollLink></div>
    </footer>
  );
}
