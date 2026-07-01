import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Resolve the Postgres connection string from whichever env var is present so
// the app works with either setup:
//   - DATABASE_URL          → explicit (local dev, or a manually-set Vercel var)
//   - POSTGRES_PRISMA_URL   → injected by the Vercel ↔ Supabase integration
//                             (transaction pooler, pgbouncer-ready — ideal for serverless)
//   - POSTGRES_URL          → generic pooled URL also injected by the integration
// Prisma CLI commands (generate/db push) still read DATABASE_URL from schema.prisma.
const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
