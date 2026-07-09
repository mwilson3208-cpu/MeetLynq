"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";

export type CheckInState = { ok?: boolean; error?: string; name?: string; already?: boolean } | null;

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function revalidate(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/check-in`);
  revalidatePath(`/dashboard/events/${eventId}/attendees`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/badges`);
}

/** Mark a registration checked in (idempotent): CheckIn record + badge + status. */
async function doCheckIn(registrationId: string, eventId: string, method: string) {
  const existing = await db.checkIn.findUnique({ where: { registrationId } });
  if (!existing) {
    await db.checkIn.create({ data: { eventId, registrationId, method, staffName: "Front desk" } });
  }
  const badge = await db.badge.findUnique({ where: { registrationId } });
  if (!badge) {
    await db.badge.create({ data: { eventId, registrationId } }).catch(() => {});
  }
  await db.registration.update({ where: { id: registrationId }, data: { status: "CHECKED_IN" } });
}

/** Look up an attendee by QR token, email, or name and check them in. */
export async function checkInByLookup(_prev: CheckInState, fd: FormData): Promise<CheckInState> {
  const event = await getEventOr404(str(fd, "eventId"));
  const q = str(fd, "query");
  if (!q) return { error: "Enter a name, email, or QR code." };

  let reg =
    (await db.registration.findFirst({ where: { eventId: event.id, qrToken: q } })) ?? null;

  if (!reg) {
    const badge = await db.badge.findFirst({
      where: { eventId: event.id, qrToken: q },
      include: { registration: true },
    });
    reg = badge?.registration ?? null;
  }
  if (!reg) {
    reg = await db.registration.findFirst({ where: { eventId: event.id, email: q.toLowerCase() } });
  }
  if (!reg) {
    reg = await db.registration.findFirst({
      where: {
        eventId: event.id,
        status: { not: "CANCELED" },
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }

  if (!reg) return { error: `No attendee found for "${q}".` };
  const name = `${reg.firstName} ${reg.lastName}`;
  if (reg.status === "CANCELED") return { error: `${name}'s registration was canceled.` };
  if (reg.status === "CHECKED_IN") return { ok: true, name, already: true };

  await doCheckIn(reg.id, event.id, "MANUAL");
  revalidate(event.id);
  return { ok: true, name };
}

/** Undo a check-in (e.g. mistaken scan): remove the record and revert status. */
export async function undoCheckIn(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const registrationId = str(fd, "id");
  const reg = await db.registration.findFirst({ where: { id: registrationId, eventId: event.id } });
  if (!reg) return;
  await db.checkIn.deleteMany({ where: { registrationId, eventId: event.id } });
  await db.registration.update({ where: { id: registrationId }, data: { status: "CONFIRMED" } });
  revalidate(event.id);
}
