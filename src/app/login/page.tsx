import type { Metadata } from "next";
import { AuthForm } from "~/components/auth-form";

export const metadata: Metadata = { title: "Log in | Decision Dictionary" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-[20px] border border-line bg-panel p-6 shadow-bubble sm:p-8">
        <h1 className="mb-6 font-display text-4xl">Log in</h1>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
