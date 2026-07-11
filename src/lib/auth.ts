import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "./db";

// Lightweight session auth built on Node crypto — no native deps, no external
// service. Passwords use scrypt; the session cookie is an HMAC-signed user id.
// Swap for NextAuth/Supabase Auth in production without changing call sites.

const DEV_FALLBACK_SECRET = "dev-meetlynq-secret-change-me";
const COOKIE = "meetlynq_session";
let warnedNoSecret = false;

/**
 * Resolve the session-signing secret. Never throws — auth must degrade
 * gracefully, not crash the page.
 *   1. AUTH_SECRET (explicit, ideal) — always preferred.
 *   2. Otherwise derive a stable, NON-public secret from the database
 *      connection string. It's unique per deployment and not in the repo, so
 *      sessions can't be forged with a well-known constant — while keeping the
 *      app working with zero configuration. A loud warning nudges operators to
 *      set a dedicated AUTH_SECRET.
 *   3. Local dev with no DB env configured — fall back to the dev constant.
 */
function secret(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit !== DEV_FALLBACK_SECRET) return explicit;

  const dbUrl =
    process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
  if (dbUrl) {
    if (process.env.NODE_ENV === "production" && !warnedNoSecret) {
      warnedNoSecret = true;
      console.warn(
        "[auth] AUTH_SECRET is not set — deriving a session secret from the database URL. " +
          "Set a dedicated AUTH_SECRET (`openssl rand -base64 32`) for best practice."
      );
    }
    return createHash("sha256").update(`meetlynq-session-v1:${dbUrl}`).digest("hex");
  }

  return DEV_FALLBACK_SECRET; // development / test only, no DB configured
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
