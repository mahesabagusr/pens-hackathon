import type { Metadata } from "next";
import { LandingHome } from "~/components/landing-home";

export const metadata: Metadata = {
  title: "Decidely | Know who decides, and why",
  description: "Find the decision maker, inspect the evidence, and prepare your next sales conversation with connected account context.",
};

export default function Home() {
  return <LandingHome />;
}
