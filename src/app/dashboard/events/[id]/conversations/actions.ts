"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";

type State = { ok?: boolean; error?: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function revalidate(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/conversations`);
}

/** Post a message from the organizer into a conversation. */
export async function sendMessage(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const conversationId = str(fd, "conversationId");
  const body = str(fd, "body");
  if (!body) return;
  const convo = await db.conversation.findFirst({ where: { id: conversationId, eventId: event.id } });
  if (!convo) return;
  await db.conversationMessage.create({ data: { conversationId, senderName: "You", body } });
  revalidate(event.id);
}

/** Start a new private conversation between two participants. */
export async function startConversation(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const aId = str(fd, "participantAId");
  const bId = str(fd, "participantBId");
  if (!aId || !bId) return { error: "Pick two participants." };
  if (aId === bId) return { error: "Pick two different participants." };

  const found = await db.participant.count({ where: { id: { in: [aId, bId] }, eventId: event.id } });
  if (found !== 2) return { error: "Those participants weren't found for this event." };

  const message = str(fd, "message");
  await db.conversation.create({
    data: {
      eventId: event.id,
      kind: "PRIVATE",
      members: { create: [{ participantId: aId }, { participantId: bId }] },
      messages: message ? { create: [{ senderName: "You", body: message }] } : undefined,
    },
  });
  revalidate(event.id);
  return { ok: true };
}
