"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";

type State = { ok?: boolean; error?: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function dollarsToCents(v: string): number {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
function optInt(v: string): number | null {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function optDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function authorize(fd: FormData) {
  const eventId = str(fd, "eventId");
  const event = await getEventOr404(eventId); // 404s if not owned by the current org
  return event;
}

// --- Tickets ---------------------------------------------------------------

export async function createTicket(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Ticket name is required." };
  const type = str(fd, "type") || "PAID";
  const priceCents = type === "FREE" ? 0 : dollarsToCents(str(fd, "price"));
  await db.ticket.create({
    data: {
      eventId: event.id,
      name,
      type,
      priceCents,
      quantity: optInt(str(fd, "quantity")),
      description: str(fd, "description") || null,
      earlyBird: fd.get("earlyBird") === "on",
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/tickets`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function updateTicket(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "Ticket name is required." };
  const type = str(fd, "type") || "PAID";
  const priceCents = type === "FREE" ? 0 : dollarsToCents(str(fd, "price"));
  await db.ticket.updateMany({
    where: { id, eventId: event.id },
    data: {
      name,
      type,
      priceCents,
      quantity: optInt(str(fd, "quantity")),
      description: str(fd, "description") || null,
      earlyBird: fd.get("earlyBird") === "on",
      isActive: fd.get("isActive") === "on",
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/tickets`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function deleteTicket(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.ticket.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/tickets`);
  revalidatePath(`/e/${event.slug}`);
}

// --- Speakers --------------------------------------------------------------

export async function createSpeaker(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Speaker name is required." };
  await db.speaker.create({
    data: {
      eventId: event.id,
      name,
      title: str(fd, "title") || null,
      companyName: str(fd, "companyName") || null,
      bio: str(fd, "bio") || null,
      sessionTitle: str(fd, "sessionTitle") || null,
      featured: fd.get("featured") === "on",
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/speakers`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function updateSpeaker(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Speaker name is required." };
  await db.speaker.updateMany({
    where: { id: str(fd, "id"), eventId: event.id },
    data: {
      name,
      title: str(fd, "title") || null,
      companyName: str(fd, "companyName") || null,
      bio: str(fd, "bio") || null,
      sessionTitle: str(fd, "sessionTitle") || null,
      featured: fd.get("featured") === "on",
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/speakers`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function deleteSpeaker(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.speaker.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/speakers`);
  revalidatePath(`/e/${event.slug}`);
}

// --- Sponsors --------------------------------------------------------------

export async function createSponsor(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Sponsor name is required." };
  await db.sponsor.create({
    data: {
      eventId: event.id,
      name,
      level: str(fd, "level") || "GOLD",
      description: str(fd, "description") || null,
      website: str(fd, "website") || null,
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/sponsors`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function updateSponsor(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Sponsor name is required." };
  await db.sponsor.updateMany({
    where: { id: str(fd, "id"), eventId: event.id },
    data: {
      name,
      level: str(fd, "level") || "GOLD",
      description: str(fd, "description") || null,
      website: str(fd, "website") || null,
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/sponsors`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function deleteSponsor(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.sponsor.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/sponsors`);
  revalidatePath(`/e/${event.slug}`);
}

// --- Sessions --------------------------------------------------------------

export async function createSession(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const title = str(fd, "title");
  if (!title) return { error: "Session title is required." };
  await db.session.create({
    data: {
      eventId: event.id,
      title,
      trackId: str(fd, "trackId") || null,
      speakerId: str(fd, "speakerId") || null,
      room: str(fd, "room") || null,
      format: str(fd, "format") || "TALK",
      capacity: optInt(str(fd, "capacity")),
      startsAt: optDate(str(fd, "startsAt")),
      endsAt: optDate(str(fd, "endsAt")),
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/agenda`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function updateSession(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const title = str(fd, "title");
  if (!title) return { error: "Session title is required." };
  await db.session.updateMany({
    where: { id: str(fd, "id"), eventId: event.id },
    data: {
      title,
      trackId: str(fd, "trackId") || null,
      speakerId: str(fd, "speakerId") || null,
      room: str(fd, "room") || null,
      format: str(fd, "format") || "TALK",
      capacity: optInt(str(fd, "capacity")),
      startsAt: optDate(str(fd, "startsAt")),
      endsAt: optDate(str(fd, "endsAt")),
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/agenda`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}

export async function deleteSession(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.session.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/agenda`);
  revalidatePath(`/e/${event.slug}`);
}

// --- Companies -------------------------------------------------------------

export async function createCompany(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Company name is required." };
  await db.company.create({
    data: {
      eventId: event.id,
      name,
      industry: str(fd, "industry") || null,
      website: str(fd, "website") || null,
      boothNumber: str(fd, "boothNumber") || null,
      description: str(fd, "description") || null,
      lookingFor: str(fd, "lookingFor") || null,
      offering: str(fd, "offering") || null,
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/companies`);
  return { ok: true };
}

export async function deleteCompany(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.company.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/companies`);
}

// --- Exhibitors ------------------------------------------------------------

export async function createExhibitor(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const name = str(fd, "name");
  if (!name) return { error: "Exhibitor name is required." };
  await db.exhibitor.create({
    data: {
      eventId: event.id,
      name,
      boothNumber: str(fd, "boothNumber") || null,
      website: str(fd, "website") || null,
      description: str(fd, "description") || null,
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/exhibitors`);
  return { ok: true };
}

export async function deleteExhibitor(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.exhibitor.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/exhibitors`);
}

// --- Coupons ---------------------------------------------------------------

export async function createCoupon(_prev: State | null, fd: FormData): Promise<State> {
  const event = await authorize(fd);
  const code = str(fd, "code").toUpperCase();
  if (!code) return { error: "Coupon code is required." };

  const kind = str(fd, "kind") || "PERCENT";
  const rawValue = str(fd, "value");
  let percentOff: number | null = null;
  let amountOffCents: number | null = null;
  if (kind === "PERCENT") {
    const p = optInt(rawValue);
    if (!p || p <= 0 || p > 100) return { error: "Enter a percentage between 1 and 100." };
    percentOff = p;
  } else {
    const cents = dollarsToCents(rawValue);
    if (cents <= 0) return { error: "Enter a discount amount greater than 0." };
    amountOffCents = cents;
  }

  const existing = await db.coupon.findFirst({ where: { eventId: event.id, code } });
  if (existing) return { error: `Code "${code}" already exists for this event.` };

  await db.coupon.create({
    data: {
      eventId: event.id,
      code,
      percentOff,
      amountOffCents,
      maxRedemptions: optInt(str(fd, "maxRedemptions")),
    },
  });
  revalidatePath(`/dashboard/events/${event.id}/tickets`);
  return { ok: true };
}

export async function deleteCoupon(fd: FormData): Promise<void> {
  const event = await authorize(fd);
  await db.coupon.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidatePath(`/dashboard/events/${event.id}/tickets`);
}
