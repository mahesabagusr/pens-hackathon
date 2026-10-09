import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "~/components/dashboard-shell";
import { currentUser } from "~/server/auth";
import { accountOptions } from "~/server/discovery";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-background" aria-busy />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

// Request time: the session, and the chat key, which is only set at runtime in Docker.
async function Shell({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/login");
  let accounts: ReturnType<typeof accountOptions> = [];
  try {
    accounts = accountOptions();
  } catch {} // the page shows the dataset error; the sidebar still navigates
  return (
    <DashboardShell user={{ name: user.name, email: user.email }} accounts={accounts} configured={Boolean(process.env.GEMINI_API_KEY)}>
      {children}
    </DashboardShell>
  );
}
