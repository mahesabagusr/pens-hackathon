import { SessionNav } from "~/components/session-nav";
import { SiteFooter } from "~/components/site-footer";

// Marketing and auth pages share the top nav and footer; the dashboard has its own shell.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SessionNav />
      {children}
      <SiteFooter />
    </>
  );
}
