import path from "node:path";
import { defineConfig } from "prisma/config";

// A Prisma config file disables Prisma's automatic .env loading, so restore it
// here for local dev (db:push / db:seed). Guarded because .env is absent in CI /
// on Vercel, where the datasource URL comes from the platform environment.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // no .env file (CI / production) — env vars are already provided
}

// Replaces the deprecated `package.json#prisma` block.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
