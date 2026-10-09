import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/client";

export const metadata: Metadata = {
  title: "Follow graph demo",
  description: "Users stored in Postgres, follows and suggestions in Neo4j.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
