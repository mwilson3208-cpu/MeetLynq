"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

/**
 * Generate name badges for every non-canceled registration that doesn't already
 * have one. Pulls title/company from the attendee's participant profile when
 * present. Idempotent — existing badges are left untouched.
 */
export async function generateBadges(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));

  const registrations = await db.registration.findMany({
    where: { eventId: event.id, status: { not: "CANCELED" }, badge: { is: null } },
    include: { participant: { select: { title: true, companyName: true } } },
  });

  if (registrations.length === 0) return;

  await db.badge.createMany({
    data: registrations.map((r) => ({
      eventId: event.id,
      registrationId: r.id,
      title: r.participant?.title ?? null,
      company: r.participant?.companyName ?? null,
    })),
    skipDuplicates: true,
  });

  revalidatePath(`/dashboard/events/${event.id}/badges`);
}
