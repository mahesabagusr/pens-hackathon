import type { Metadata } from "next";
import { AuthForm } from "../auth/auth-form";

export const metadata: Metadata = { title: "Register | Decision Dictionary" };

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-[20px] border border-line bg-panel p-6 sm:p-8">
        <h1 className="font-display text-4xl">Create an account</h1>
        <p className="mb-6 mt-2 text-muted">
          This is a demo on a synthetic dataset. Your name, email and a hash of your password are stored in the project&apos;s
          Postgres database.
        </p>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
