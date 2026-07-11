import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "./db";

// Lightweight session auth built on Node crypto — no native deps, no external
// service. Passwords use scrypt; the session cookie is an HMAC-signed user id.
// Swap for NextAuth/Supabase Auth in production without changing call sites.

const DEV_FALLBACK_SECRET = "dev-meetlynq-secret-change-me";
const COOKIE = "meetlynq_session";

/**
 * Resolve the session-signing secret. In production we refuse to fall back to
 * the well-known default: signing cookies with a public constant would let
 * anyone forge a session for any user. Fail closed instead. Evaluated lazily
 * (not at module load) so the build and public pages aren't affected, only
 * actual auth operations.
 */
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s !== DEV_FALLBACK_SECRET) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is not configured. Set a strong AUTH_SECRET (e.g. `openssl rand -base64 32`) — " +
        "refusing to sign or verify sessions with the default secret."
    );
  }
  return DEV_FALLBACK_SECRET; // development / test only
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, 64);
  return hashBuf.length === test.length && timingSafeEqual(hashBuf, test);
}

function sign(value: string) {
  const mac = createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", secret()).update(value).digest("hex");
  try {
    if (timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return value;
  } catch {
    return null;
  }
  return null;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const userId = unsign(store.get(COOKIE)?.value);
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { organization: true } } },
  });
  return user;
}
