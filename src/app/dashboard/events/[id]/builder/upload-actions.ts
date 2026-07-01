"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { uploadImage } from "@/lib/storage";

type UploadState = { url?: string; error?: string } | null;

/** Upload an event cover image to Supabase Storage and persist the URL. */
export async function uploadEventCover(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const eventId = String(formData.get("eventId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image first." };

  const event = await getEventOr404(eventId); // authorizes against the current org
  const res = await uploadImage(file, `events/${event.id}/cover`);
  if (!res.ok || !res.url) return { error: res.error ?? "Upload failed." };

  await db.event.update({ where: { id: event.id }, data: { coverImageUrl: res.url } });
  revalidatePath(`/dashboard/events/${event.id}/builder`);
  revalidatePath(`/e/${event.slug}`);
  return { url: res.url };
}
