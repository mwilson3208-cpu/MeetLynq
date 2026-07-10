"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { MEETING_STATUS } from "@/lib/constants";

type State = { ok?: boolean; error?: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function revalidate(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/meetings`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/reports`);
  revalidatePath("/portal");
}

/** Approve / decline / reschedule / complete / no-show / cancel a meeting. */
export async function setMeetingStatus(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const status = str(fd, "status");
  if (!MEETING_STATUS[status]) return;
  const meeting = await db.meeting.findFirst({ where: { id: str(fd, "id"), eventId: event.id } });
  if (!meeting) return;
  await db.meeting.update({
    where: { id: meeting.id },
    data: {
      status,
      noShow: status === "NO_SHOW",
      declineReason: status === "DECLINED" ? str(fd, "declineReason") || meeting.declineReason : meeting.declineReason,
    },
  });
  revalidate(event.id);
}

/** Organizer schedules a 1:1 meeting between two participants. */
export async function scheduleMeeting(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const aId = str(fd, "participantAId");
  const bId = str(fd, "participantBId");
  if (!aId || !bId) return { error: "Pick two participants." };
  if (aId === bId) return { error: "Pick two different participants." };

  const participants = await db.participant.findMany({
    where: { id: { in: [aId, bId] }, eventId: event.id },
    select: { id: true },
  });
  if (participants.length !== 2) return { error: "Those participants weren't found for this event." };

  const slotId = str(fd, "slotId") || null;
  const locationId = str(fd, "locationId") || null;

  await db.meeting.create({
    data: {
      eventId: event.id,
      slotId,
      locationId,
      type: "ONE_TO_ONE",
      status: "APPROVED",
      mode: str(fd, "mode") || "IN_PERSON",
      goal: str(fd, "goal") || null,
      participants: {
        create: [
          { participantId: aId, role: "REQUESTER", response: "ACCEPTED" },
          { participantId: bId, role: "INVITEE", response: "ACCEPTED" },
        ],
      },
    },
  });
  revalidate(event.id);
  return { ok: true };
}

/** Remove a meeting (cascades its participants and ratings). */
export async function deleteMeeting(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  await db.meeting.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidate(event.id);
}
