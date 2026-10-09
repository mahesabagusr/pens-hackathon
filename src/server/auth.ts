import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "./db";

const COOKIE = "session";
const WEEK = 60 * 60 * 24 * 7;

const kdf = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await kdf(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  const [salt, hash] = (stored ?? "").split(":");
  if (!salt || !hash) return false;
  const want = Buffer.from(hash, "hex");
  const got = await kdf(password, Buffer.from(salt, "hex"));
  return want.length === got.length && timingSafeEqual(want, got);
}

function sign(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// ponytail: stateless signed cookie, so logout only clears this browser's copy. Add a Session table to revoke server-side.
export async function startSession(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + WEEK}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser() {
  await connection(); // request-time only: the expiry check reads the clock, which Cache Components forbids during prerender
  const value = (await cookies()).get(COOKIE)?.value;
  const [id, exp, mac] = value?.split(".") ?? [];
  if (!id || !exp || !mac || Number(exp) < Date.now() / 1000) return null;
  const want = Buffer.from(sign(`${id}.${exp}`));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
}
