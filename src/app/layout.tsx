import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/client";

const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Inter-Semibold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Inter-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-inter", display: "swap",
});
const plexSans = localFont({ src: "./fonts/IBMPlexSans-Medium.ttf", weight: "500", variable: "--font-plex-sans", display: "swap" });
const plexMono = localFont({ src: "./fonts/IBMPlexMono-Regular.ttf", weight: "400", variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Decision Dictionary",
  description: "Every discount, exception and feature promise at KasirNusa as a dictionary entry, linked to the deal, email and roadmap behind it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
