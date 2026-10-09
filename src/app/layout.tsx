import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/client";

const glitch = localFont({ src: "./fonts/BasedashGlitch-500.woff2", weight: "500", variable: "--font-glitch" });

export const metadata: Metadata = {
  title: "Decision Dictionary",
  description: "Ask a context graph who made each discount, exception and feature promise at KasirNusa, and why.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${glitch.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
