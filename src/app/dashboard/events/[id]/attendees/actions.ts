"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { REGISTRATION_STATUS } from "@/lib/constants";
import { sendEmail, EMAIL_TEMPLATES } from "@/lib/email";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

/**
 * Move a registration through its lifecycle (approve / waitlist / decline /
 * cancel / restore). Confirming creates the participant profile and sends the
 * confirmation email; other transitions just update the status.
 */
export async function setRegistrationStatus(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const status = str(fd, "status");
  if (!REGISTRATION_STATUS[status]) return;

  const reg = await db.registration.findFirst({
    where: { id: str(fd, "id"), eventId: event.id },
    include: { participant: true },
  });
  if (!reg) return;

  await db.registration.update({ where: { id: reg.id }, data: { status } });

  if (status === "CONFIRMED" && !reg.participant) {
    await db.participant
      .create({
        data: {
          eventId: event.id,
          registrationId: reg.id,
          name: `${reg.firstName} ${reg.lastName}`,
          email: reg.email.toLowerCase(),
          visibility: "PUBLIC",
        },
      })
      .catch(() => {});
    const tpl = EMAIL_TEMPLATES.registrationConfirmation(reg.firstName, event.name);
    await sendEmail({ to: reg.email, subject: tpl.subject, text: tpl.text });
  }

  revalidatePath(`/dashboard/events/${event.id}/attendees`);
  revalidatePath(`/dashboard/events/${event.id}`);
  revalidatePath(`/dashboard/events/${event.id}/check-in`);
}

type MutationState = { ok?: boolean; error?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Organizer-side manual registration: creates a confirmed registration (and
 * its participant profile) without going through the public form. Used by the
 * "Add attendee" dialog.
 */
export async function addAttendee(_prev: MutationState, fd: FormData): Promise<MutationState> {
  const event = await getEventOr404(str(fd, "eventId"));
  const firstName = str(fd, "firstName").slice(0, 80);
  const lastName = str(fd, "lastName").slice(0, 80);
  const email = str(fd, "email").toLowerCase().slice(0, 254);
  if (!firstName || !lastName || !email) return { error: "Name and email are required." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };

  const dupe = await db.registration.findFirst({ where: { eventId: event.id, email } });
  if (dupe) return { error: "That email is already registered for this event." };

  const ticketId = str(fd, "ticketId") || null;
  if (ticketId) {
    const ticket = await db.ticket.findFirst({ where: { id: ticketId, eventId: event.id } });
    if (!ticket) return { error: "That ticket wasn't found for this event." };
  }

  const reg = await db.registration.create({
    data: { eventId: event.id, ticketId, email, firstName, lastName, status: "CONFIRMED", answers: "{}" },
  });
  if (ticketId) {
    await db.ticket.update({ where: { id: ticketId }, data: { sold: { increment: 1 } } }).catch(() => {});
  }
  const existing = await db.participant.findUnique({ where: { registrationId: reg.id } });
  if (!existing) {
    await db.participant.create({
      data: { eventId: event.id, registrationId: reg.id, name: `${firstName} ${lastName}`, email },
    });
  }
  const tpl = EMAIL_TEMPLATES.registrationConfirmation(firstName, event.name);
  await sendEmail({ to: email, subject: tpl.subject, text: tpl.text }).catch((err) =>
    console.error("[addAttendee:email]", err)
  );
  revalidatePath(`/dashboard/events/${event.id}/attendees`);
  revalidatePath(`/dashboard/events/${event.id}`);
  return { ok: true };
}
