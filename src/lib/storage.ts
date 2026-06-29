import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase Storage layer for logos, cover images, badges, and speaker resources.
// Reads the credentials injected by the Vercel ↔ Supabase integration (or set
// manually). When Storage isn't configured, helpers degrade gracefully so the
// rest of the app keeps working.

export const MEDIA_BUCKET = "event-media";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the service-role key for server-side uploads (bypasses RLS); fall back
// to the anon key for public reads / public-bucket setups.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isStorageConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!isStorageConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_KEY as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_BYTES = 5 * 1024 * 1024;

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image to the public media bucket and return its public URL.
 * `prefix` namespaces the object path (e.g. "events/<id>/logo").
 */
export async function uploadImage(file: File, prefix: string): Promise<UploadResult> {
  const supabase = getClient();
  if (!supabase) {
    return { ok: false, error: "File storage is not configured. Set the SUPABASE_* environment variables." };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPEG, WebP, GIF, or SVG." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (max 5 MB)." };
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const safePrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "");
  const path = `${safePrefix}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
