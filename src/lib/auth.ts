import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { get, run, nowIso, newId } from "./db";
import type { User } from "./types";

const COOKIE = "mercado_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string) {
  const token = newId("s_") + randomBytes(12).toString("hex");
  run("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", [
    token,
    userId,
    nowIso(),
  ]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token = ?", [token]);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const user = get<User>(
    `SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?`,
    [token],
  );
  return user ?? null;
}

/**
 * Devuelve la persona autenticada o la manda a iniciar sesión.
 * El layout de «Mi cuenta» y sus páginas se renderizan en paralelo, así que cada
 * página debe protegerse por su cuenta.
 */
export async function requireUser(next = "/mypage"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
