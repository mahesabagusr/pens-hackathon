"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, hashPassword, startSession, verifyPassword } from "~/server/auth";
import { db } from "~/server/db";

export type AuthState = {
  errors?: { name?: string; email?: string; password?: string; form?: string };
  values?: { name: string; email: string };
};

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z.string().min(8, "Use at least 8 characters.").max(200, "Use 200 characters or fewer.");

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

// ponytail: no rate limit on attempts. Add one per IP and per email before exposing this publicly.
export async function register(_: AuthState, data: FormData): Promise<AuthState> {
  const values = { name: text(data, "name").trim(), email: text(data, "email").trim() };
  const parsed = z.object({ name: z.string().min(1, "Enter your name.").max(100), email, password }).safeParse({
    ...values,
    password: text(data, "password"),
  });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return { values, errors: { name: f.name?.[0], email: f.email?.[0], password: f.password?.[0] } };
  }
  const { name, email: address, password: plain } = parsed.data;
  if (await db.user.findUnique({ where: { email: address } })) {
    return { values, errors: { email: "An account with this email already exists. Log in instead." } };
  }
  const user = await db.user.create({ data: { name, email: address, passwordHash: await hashPassword(plain) } });
  await startSession(user.id);
  redirect("/");
}

export async function login(_: AuthState, data: FormData): Promise<AuthState> {
  const values = { name: "", email: text(data, "email").trim() };
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse({
    email: values.email,
    password: text(data, "password"),
  });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return { values, errors: { email: f.email?.[0], password: f.password?.[0] } };
  }
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same message for an unknown email and a wrong password, so the form does not reveal which accounts exist.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { values, errors: { form: "Email or password is incorrect." } };
  }
  await startSession(user.id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/");
}
