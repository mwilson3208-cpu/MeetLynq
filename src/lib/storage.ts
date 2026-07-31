import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "./upload-limits";

// Supabase Storage layer for logos, cover images, badges, and speaker resources.
// Reads the credentials injected by the Vercel ↔ Supabase integration (or set
// manually). When Storage isn't configured, helpers degrade gracefully so the
// rest of the app keeps working.

export const MEDIA_BUCKET = "event-media";

// The project URL is public by design (Supabase ships it in client bundles),
// so a production fallback in code is safe and ends any dependency on env
// configuration for it. The keys below are secrets and must come from env.
const DEFAULT_SUPABASE_URL = "https://gydifuojjfevavawpllf.supabase.co";
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File is too large (max ${MAX_UPLOAD_LABEL}).` };
  }

  // Derive the extension from the (untrusted) filename, then hard-restrict it
  // to a short alphanumeric token so it can't smuggle path separators or other
  // characters into the object key.
  const rawExt = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
  const ext = /^[a-zA-Z0-9]{1,8}$/.test(rawExt) ? rawExt.toLowerCase() : "png";
  const safePrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\.+/g, "");
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
