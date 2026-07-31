import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Admin-only storage diagnostics: reports which SUPABASE_* variables the
 * runtime can see (presence booleans and matching names only — values are
 * never returned).
 */
export async function GET() {
  await requireAdmin();

  const present = (name: string) => {
    const v = process.env[name];
    return v ? { set: true, length: v.length } : { set: false };
  };

  let urlHost: string | null = null;
  try {
    const raw = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (raw) urlHost = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).host;
  } catch {
    urlHost = "INVALID_URL_VALUE";
  }

  return NextResponse.json({
    storageConfigured: isStorageConfigured(),
    expectedVars: {
      SUPABASE_URL: present("SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_ANON_KEY: present("SUPABASE_ANON_KEY"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
    urlHost,
    // Every env var name that looks storage/database related — names only, to
    // catch near-miss spellings. Values are never included.
    similarNames: Object.keys(process.env)
      .filter((n) => /SUPA|STORAGE|DATABASE|POSTGRES/i.test(n))
      .sort(),
  });
}
