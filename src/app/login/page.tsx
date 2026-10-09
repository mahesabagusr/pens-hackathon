import type { Metadata } from "next";
import { AuthForm } from "../auth/auth-form";

export const metadata: Metadata = { title: "Log in | Decision Dictionary" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-[20px] border border-line bg-panel p-6 sm:p-8">
        <h1 className="font-display text-4xl">Log in</h1>
        <p className="mb-6 mt-2 text-muted">Use the email and password you registered with.</p>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
