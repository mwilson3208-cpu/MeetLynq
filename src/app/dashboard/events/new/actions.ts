"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/queries";
import { slugify } from "@/lib/utils";
import { generate } from "@/lib/ai";

export async function createEvent(_prev: unknown, formData: FormData) {
  const { org, user } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Please give your event a name." };

  const type = String(formData.get("type") ?? "CONFERENCE");
  const format = String(formData.get("format") ?? "IN_PERSON");
  const tagline = String(formData.get("tagline") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const startsAtRaw = String(formData.get("startsAt") ?? "");
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
      city,
      brandColor: org.brandColor,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
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
