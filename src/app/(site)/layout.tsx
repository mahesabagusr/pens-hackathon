import { SessionNav } from "~/components/session-nav";
import { SiteFooter } from "~/components/site-footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SessionNav />
      {children}
      <SiteFooter />
    </>
  );
}
