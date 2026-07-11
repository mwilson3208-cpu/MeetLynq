"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/queries";
import { slugify } from "@/lib/utils";
import { generate } from "@/lib/ai";
import { EVENT_TYPES, EVENT_FORMATS } from "@/lib/constants";

// Keep free-text inputs within sane bounds so a crafted/oversized POST can't
// bloat the row or the rendered page. The DB columns are unbounded text.
const MAX_NAME = 200;
const MAX_TAGLINE = 300;

/** Parse a date input, returning null for empty or invalid values. */
function optDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEvent(_prev: unknown, formData: FormData) {
  const { org, user } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim().slice(0, MAX_NAME);
  if (!name) return { error: "Please give your event a name." };

  // Only accept known enum values; fall back to the default for anything else.
  const typeRaw = String(formData.get("type") ?? "");
  const type = typeRaw in EVENT_TYPES ? typeRaw : "CONFERENCE";
  const formatRaw = String(formData.get("format") ?? "");
  const format = formatRaw in EVENT_FORMATS ? formatRaw : "IN_PERSON";
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, MAX_TAGLINE) || null;
  const venueName = String(formData.get("venueName") ?? "").trim().slice(0, MAX_NAME) || null;
  const venueAddress = String(formData.get("venueAddress") ?? "").trim().slice(0, MAX_TAGLINE) || null;
  const city = String(formData.get("city") ?? "").trim().slice(0, MAX_NAME) || null;
  const country = String(formData.get("country") ?? "").trim().slice(0, MAX_NAME) || null;
  const startsAt = optDate(String(formData.get("startsAt") ?? ""));
  const useAi = formData.get("useAi") === "on";

  let slug = slugify(name) || "event";
  if (await db.event.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  let description: string | null = null;
  if (useAi) {
    const ai = await generate("event_description", { name });
    description = ai.output;
  }

  const event = await db.event.create({
    data: {
      organizationId: org.id,
      name,
      slug,
      tagline,
      description,
      type,
      format,
      venueName,
      venueAddress,
      city,
      country,
      brandColor: org.brandColor,
      startsAt,
      status: "DRAFT",
      pages: {
        create: { key: "home", title: "Home", isHome: true, published: false, navOrder: 0 },
      },
    },
  });

  await db.auditLog.create({
    data: { organizationId: org.id, userId: user.id, action: "event.created", entity: "Event", entityId: event.id },
  }).catch(() => {});

  redirect(`/dashboard/events/${event.id}`);
}
