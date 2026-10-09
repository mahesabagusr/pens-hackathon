"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, type AuthState } from "./actions";

const input =
  "mt-1 block min-h-12 w-full rounded-md border border-line bg-background px-3 text-ink placeholder:text-muted aria-[invalid=true]:border-danger";

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-msg`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-msg`} className="mt-1 text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [state, action, pending] = useActionState<AuthState, FormData>(isRegister ? register : login, {});
  const [show, setShow] = useState(false);
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      {e.form && (
        <p role="alert" className="rounded-md border border-danger p-3 text-sm">
          {e.form}
        </p>
      )}

      {isRegister && (
        <Field label="Name" name="name" error={e.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
            aria-invalid={!!e.name}
            aria-describedby={e.name ? "name-msg" : undefined}
            className={input}
          />
        </Field>
      )}

      <Field label="Email" name="email" error={e.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={!!e.email}
          aria-describedby={e.email ? "email-msg" : undefined}
          className={input}
        />
      </Field>

      <Field label="Password" name="password" error={e.password} hint={isRegister ? "At least 8 characters." : undefined}>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            aria-invalid={!!e.password}
            aria-describedby={e.password || isRegister ? "password-msg" : undefined}
            className={`${input} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-pressed={show}
            className="absolute right-1 top-1 flex min-h-11 items-center rounded-md px-3 text-sm text-muted hover:text-ink"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-md bg-accent px-6 font-medium text-black transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {pending ? (isRegister ? "Creating account…" : "Logging in…") : isRegister ? "Create account" : "Log in"}
      </button>

      <p className="text-sm text-muted">
        {isRegister ? "Already registered? " : "No account yet? "}
        <Link href={isRegister ? "/login" : "/register"} className="text-ink underline underline-offset-4 hover:no-underline">
          {isRegister ? "Log in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
