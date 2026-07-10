import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Diagnostic endpoint: verifies the app's Prisma connection can both READ and
 * WRITE (in a rolled-back transaction) against the live database, and reports
 * which connection env var is in use — without ever exposing the DSN, host, or
 * any credential. Safe to leave in place; returns no secrets.
 */
function connectionInfo() {
  const which = process.env.DATABASE_URL
    ? "DATABASE_URL"
    : process.env.POSTGRES_PRISMA_URL
      ? "POSTGRES_PRISMA_URL"
      : process.env.POSTGRES_URL
        ? "POSTGRES_URL"
        : "none";
  const raw =
    process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
  let host = "unknown";
  let port = "unknown";
  let pgbouncer = false;
  let pooler = false;
  if (raw) {
    try {
      const u = new URL(raw);
      // Mask the host: keep only the suffix so we can tell pooler vs direct.
      pooler = u.port === "6543" || u.hostname.includes("pooler.supabase.com");
      host = u.hostname.includes("pooler.supabase.com")
        ? "*.pooler.supabase.com"
        : u.hostname.replace(/^db\.[^.]+/, "db.***");
      port = u.port || "(default)";
      pgbouncer = u.searchParams.get("pgbouncer") === "true";
    } catch {
      /* ignore parse errors */
    }
  }
  return { source: which, host, port, pooler, pgbouncer };
}

export async function GET() {
  const info = connectionInfo();
  const result: Record<string, unknown> = { connection: info };

  // READ check
  try {
    result.readOk = true;
    result.userCount = await db.user.count();
  } catch (err) {
    result.readOk = false;
    result.readError = err instanceof Error ? err.message : String(err);
  }

  // WRITE check — create then delete a throwaway row inside a transaction that
  // we roll back, so nothing is persisted even on success.
  try {
    await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: "healthcheck", slug: `healthcheck-${Date.now().toString(36)}` },
      });
      await tx.organization.delete({ where: { id: org.id } });
    });
    result.writeOk = true;
  } catch (err) {
    result.writeOk = false;
    result.writeError = err instanceof Error ? err.message : String(err);
  }

  const ok = result.readOk === true && result.writeOk === true;
  return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 500 });
}
