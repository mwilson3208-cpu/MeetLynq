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
