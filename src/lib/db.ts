import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Resolve the Postgres connection string from whichever env var is present so
// the app works with either setup:
//   - DATABASE_URL          → explicit (local dev, or a manually-set Vercel var)
//   - POSTGRES_PRISMA_URL   → injected by the Vercel ↔ Supabase integration
//                             (transaction pooler, pgbouncer-ready — ideal for serverless)
//   - POSTGRES_URL          → generic pooled URL also injected by the integration
// Prisma CLI commands (generate/db push) still read DATABASE_URL from schema.prisma.
const rawUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL;

/**
 * When the connection points at a PgBouncer/Supavisor transaction pooler
 * (Supabase runtime connection, port 6543 or a *.pooler.supabase.com host),
 * Prisma MUST run without server-side prepared statements — otherwise every
 * transaction / nested write (e.g. signup, registration) fails with
 * "prepared statement already exists" while simple reads may still slip
 * through. Force `pgbouncer=true` (disables prepared statements) and cap
 * `connection_limit=1` for serverless, even if the operator forgot to append
 * them to the string. Direct (5432) connections are left untouched.
 */
export function normalizePoolerUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    const isPooler = u.port === "6543" || u.hostname.includes("pooler.supabase.com");
    if (isPooler) {
      if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
      if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    }
    return u.toString();
  } catch {
    // Not a parseable URL (shouldn't happen for a real DSN) — use as-is.
    return url;
  }
}

const datasourceUrl = normalizePoolerUrl(rawUrl);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
