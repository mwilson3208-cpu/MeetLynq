import { notFound } from "next/navigation";
import { cache as reactCache } from "react";
import { db } from "./db";
import { getCurrentUser } from "./auth";

// requireOrg/getEventOr404 run in the layout AND the page of every dashboard
// route (and again in any server action the click triggers). React cache()
// dedupes them within a request — in production each duplicate is a full
// network round-trip to the database.

/** The organizations the current user belongs to (first is "active"). */
export const requireOrg = reactCache(async () => {
  const user = await getCurrentUser();
  if (!user) notFound();
  const org = user.memberships[0]?.organization;
  if (!org) notFound();
  return { user, org };
});

/** Load an event the current user's org owns, or 404. */
export const getEventOr404 = reactCache(async (eventId: string) => {
  const { org } = await requireOrg();
  const event = await db.event.findFirst({ where: { id: eventId, organizationId: org.id } });
  if (!event) notFound();
  return event;
});

/**
 * Aggregate counts used across an event's dashboard pages.
 *
 * One raw query with scalar subselects instead of nine Prisma counts: on the
 * production pooler the client runs with connection_limit=1, so "parallel"
 * counts serialize into nine sequential network round-trips per page view.
 * Collapsing them into a single statement makes this one round-trip.
 */
export const getEventStats = reactCache(async (eventId: string) => {
  const rows = await db.$queryRaw<
    {
      registrations: bigint;
      checkedIn: bigint;
      participants: bigint;
      meetings: bigint;
      sessions: bigint;
      sponsors: bigint;
      exhibitors: bigint;
      leads: bigint;
      revenueCents: bigint;
    }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM "Registration" WHERE "eventId" = ${eventId} AND "status" <> 'CANCELED') AS "registrations",
      (SELECT COUNT(*) FROM "Registration" WHERE "eventId" = ${eventId} AND "status" = 'CHECKED_IN') AS "checkedIn",
      (SELECT COUNT(*) FROM "Participant"  WHERE "eventId" = ${eventId}) AS "participants",
      (SELECT COUNT(*) FROM "Meeting"      WHERE "eventId" = ${eventId}) AS "meetings",
      (SELECT COUNT(*) FROM "Session"      WHERE "eventId" = ${eventId}) AS "sessions",
      (SELECT COUNT(*) FROM "Sponsor"      WHERE "eventId" = ${eventId}) AS "sponsors",
      (SELECT COUNT(*) FROM "Exhibitor"    WHERE "eventId" = ${eventId}) AS "exhibitors",
      (SELECT COUNT(*) FROM "Lead"         WHERE "eventId" = ${eventId}) AS "leads",
      (SELECT COALESCE(SUM(p."amountCents"), 0)
         FROM "Payment" p JOIN "Order" o ON p."orderId" = o."id"
        WHERE o."eventId" = ${eventId} AND p."status" = 'SUCCEEDED') AS "revenueCents"
  `;
  const r = rows[0];
  return {
    registrations: Number(r?.registrations ?? 0),
    checkedIn: Number(r?.checkedIn ?? 0),
    participants: Number(r?.participants ?? 0),
    meetings: Number(r?.meetings ?? 0),
    sessions: Number(r?.sessions ?? 0),
    sponsors: Number(r?.sponsors ?? 0),
    exhibitors: Number(r?.exhibitors ?? 0),
    leads: Number(r?.leads ?? 0),
    revenueCents: Number(r?.revenueCents ?? 0),
  };
});
