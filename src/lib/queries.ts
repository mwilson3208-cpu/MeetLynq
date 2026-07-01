import { notFound } from "next/navigation";
import { db } from "./db";
import { getCurrentUser } from "./auth";

/** The organizations the current user belongs to (first is "active"). */
export async function requireOrg() {
  const user = await getCurrentUser();
  if (!user) notFound();
  const org = user.memberships[0]?.organization;
  if (!org) notFound();
  return { user, org };
}

/** Load an event the current user's org owns, or 404. */
export async function getEventOr404(eventId: string) {
  const { org } = await requireOrg();
  const event = await db.event.findFirst({ where: { id: eventId, organizationId: org.id } });
  if (!event) notFound();
  return event;
}

/** Aggregate counts used across an event's dashboard pages. */
export async function getEventStats(eventId: string) {
  const [registrations, checkedIn, participants, meetings, sessions, sponsors, exhibitors, leads, revenue] =
    await Promise.all([
      db.registration.count({ where: { eventId, status: { not: "CANCELED" } } }),
      db.registration.count({ where: { eventId, status: "CHECKED_IN" } }),
      db.participant.count({ where: { eventId } }),
      db.meeting.count({ where: { eventId } }),
      db.session.count({ where: { eventId } }),
      db.sponsor.count({ where: { eventId } }),
      db.exhibitor.count({ where: { eventId } }),
      db.lead.count({ where: { eventId } }),
      db.payment.aggregate({ where: { order: { eventId }, status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    ]);
  return {
    registrations,
    checkedIn,
    participants,
    meetings,
    sessions,
    sponsors,
    exhibitors,
    leads,
    revenueCents: revenue._sum.amountCents ?? 0,
  };
}
