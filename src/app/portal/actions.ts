"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

type MutationState = { ok?: boolean; error?: string } | null;

/**
 * Meeting request from the attendee portal: creates a REQUESTED meeting from
 * the portal's participant to a suggested match. The organizer approves or
 * declines it on the Meetings page.
 */
export async function requestMatchMeeting(_prev: MutationState, fd: FormData): Promise<MutationState> {
  const meId = String(fd.get("meId") ?? "");
  const targetId = String(fd.get("targetId") ?? "");
  if (!meId || !targetId || meId === targetId) return { error: "Invalid meeting request." };

  const [me, target] = await Promise.all([
    db.participant.findUnique({ where: { id: meId } }),
    db.participant.findUnique({ where: { id: targetId } }),
  ]);
  if (!me || !target || me.eventId !== target.eventId) {
    return { error: "Those participants weren't found." };
  }

  const existing = await db.meeting.findFirst({
    where: {
      eventId: me.eventId,
      status: { in: ["REQUESTED", "APPROVED"] },
      AND: [
        { participants: { some: { participantId: me.id } } },
        { participants: { some: { participantId: target.id } } },
      ],
    },
  });
  if (existing) return { error: "You already have a meeting with this person." };

  await db.meeting.create({
    data: {
      eventId: me.eventId,
      type: "ONE_TO_ONE",
      status: "REQUESTED",
      mode: "IN_PERSON",
      goal: "Requested from attendee portal match",
      participants: {
        create: [
          { participantId: me.id, role: "REQUESTER", response: "ACCEPTED" },
          { participantId: target.id, role: "INVITEE", response: "PENDING" },
        ],
      },
    },
  });
  revalidatePath("/portal");
  return { ok: true };
}
