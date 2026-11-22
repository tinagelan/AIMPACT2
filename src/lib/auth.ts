import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Minimal passwordless (magic-link) auth.
 * Tokens are random 32-byte values; only their SHA-256 hash is stored.
 */
const SESSION_COOKIE = "aimpact_session";
const LOGIN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Creates a login token and returns the magic link. In dev the link is logged (no mail server). */
export async function createLoginLink(email: string, locale: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.loginToken.create({
    data: { email: normalizeEmail(email), tokenHash: hash(token), expiresAt: new Date(Date.now() + LOGIN_TTL_MS) },
  });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}&locale=${locale}`;
  // TODO(prod): send via a transactional mail provider instead of logging.
  console.log(`[auth] magic link for ${normalizeEmail(email)}: ${link}`);
  return link;
}

/** Consumes a login token, creates the user if needed, and sets the session cookie. */
export async function verifyLoginToken(token: string): Promise<{ userId: string } | null> {
  const row = await db.loginToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await db.loginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  const user = await db.user.upsert({ where: { email: row.email }, create: { email: row.email }, update: {} });
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { tokenHash: hash(sessionToken), userId: user.id, expiresAt } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { userId: user.id };
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(SESSION_COOKIE);
}

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean);
  return admins.includes(normalizeEmail(email));
}
