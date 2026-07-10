"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { sendEmail } from "@/lib/email";

type State = { ok?: boolean; error?: string };

const SEGMENTS = new Set(["ALL", "REGISTERED", "PENDING", "CHECKED_IN"]);

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function revalidate(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/emails`);
}

/** Registration status filter for a campaign segment. */
function segmentFilter(segment: string) {
  switch (segment) {
    case "REGISTERED":
      return { status: "CONFIRMED" };
    case "PENDING":
      return { status: "PENDING" };
    case "CHECKED_IN":
      return { status: "CHECKED_IN" };
    default: // ALL
      return { status: { not: "CANCELED" } };
  }
}

/** Distinct recipient emails for a segment within an event. */
async function recipientsFor(eventId: string, segment: string): Promise<string[]> {
  const regs = await db.registration.findMany({
    where: { eventId, ...segmentFilter(segment) },
    select: { email: true },
  });
  return Array.from(new Set(regs.map((r) => r.email.toLowerCase()).filter(Boolean)));
}

export async function createCampaign(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const subject = str(fd, "subject");
  if (!subject) return { error: "Enter a subject line." };
  const segment = str(fd, "segment");
  if (!SEGMENTS.has(segment)) return { error: "Pick a valid audience segment." };
  const name = str(fd, "name") || subject;

  await db.emailCampaign.create({
    data: {
      eventId: event.id,
      name,
      subject,
      body: str(fd, "body"),
      segment,
      status: "DRAFT",
    },
  });
  revalidate(event.id);
  return { ok: true };
}

/**
 * Send a draft campaign: resolves recipients for its segment, dispatches via the
 * email provider (mock by default), and records the real recipient count.
 */
export async function sendCampaign(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const campaign = await db.emailCampaign.findFirst({
    where: { id: str(fd, "id"), eventId: event.id },
  });
  if (!campaign || campaign.status === "SENT") return;

  const emails = await recipientsFor(event.id, campaign.segment);
  if (emails.length > 0) {
    await sendEmail({
      to: emails,
      subject: campaign.subject,
      text: campaign.body || campaign.subject,
    });
  }

  await db.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", sentAt: new Date(), recipients: emails.length },
  });
  revalidate(event.id);
}

export async function deleteCampaign(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  await db.emailCampaign.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidate(event.id);
}
