"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { EVENT_STATUS } from "@/lib/constants";

type State = { ok?: boolean; error?: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function optInt(v: string): number | null {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function optDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Update an event's core details (does not change the slug/public URL). */
export async function updateEventDetails(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const name = str(fd, "name");
  if (!name) return { error: "Event name is required." };

  await db.event.update({
    where: { id: event.id },
    data: {
      name,
      tagline: str(fd, "tagline") || null,
      description: str(fd, "description") || null,
      type: str(fd, "type") || event.type,
      format: str(fd, "format") || event.format,
      timezone: str(fd, "timezone") || event.timezone,
      venueName: str(fd, "venueName") || null,
      venueAddress: str(fd, "venueAddress") || null,
      city: str(fd, "city") || null,
      country: str(fd, "country") || null,
      capacity: optInt(str(fd, "capacity")),
      brandColor: str(fd, "brandColor") || event.brandColor,
      seoTitle: str(fd, "seoTitle") || null,
      seoDescription: str(fd, "seoDescription") || null,
      startsAt: optDate(str(fd, "startsAt")),
      endsAt: optDate(str(fd, "endsAt")),
    },
  });

  revalidatePath(`/dashboard/events/${event.id}`, "layout");
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

/** Change the event's lifecycle status (publish / unpublish / go live / end / archive). */
export async function setEventStatus(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const status = str(fd, "status");
  if (!EVENT_STATUS[status]) return;
  await db.event.update({ where: { id: event.id }, data: { status } });
  revalidatePath(`/dashboard/events/${event.id}`, "layout");
  revalidatePath(`/e/${event.slug}`);
}

/** Permanently delete an event and all of its data (cascades). */
export async function deleteEvent(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  await db.event.delete({ where: { id: event.id } });
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  // Stay on the page the delete came from (overview or events list); only
  // dashboard-internal targets are honored.
  const to = str(fd, "redirectTo");
  redirect(to.startsWith("/dashboard") ? to : "/dashboard/events");
}
