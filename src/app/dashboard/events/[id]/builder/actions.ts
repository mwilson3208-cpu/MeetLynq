"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { slugify, parseJson } from "@/lib/utils";

type State = { ok?: boolean; error?: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function revalidate(eventId: string, slug: string) {
  revalidatePath(`/dashboard/events/${eventId}/builder`);
  revalidatePath(`/e/${slug}`);
}

/** Confirm a page belongs to the current org's event. */
async function pageOfEvent(eventId: string, pageId: string) {
  return db.eventPage.findFirst({ where: { id: pageId, eventId } });
}
/** Confirm a section belongs to the current org's event. */
async function sectionOfEvent(eventId: string, sectionId: string) {
  return db.eventSection.findFirst({ where: { id: sectionId, page: { eventId } } });
}

// --- Sections --------------------------------------------------------------

export async function createSection(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const page = await pageOfEvent(event.id, str(fd, "pageId"));
  if (!page) return { error: "Page not found." };
  const type = str(fd, "type") || "richtext";
  const config = {
    heading: str(fd, "heading") || null,
    body: str(fd, "body") || null,
  };
  const max = await db.eventSection.aggregate({ where: { pageId: page.id }, _max: { order: true } });
  await db.eventSection.create({
    data: { pageId: page.id, type, order: (max._max.order ?? -1) + 1, config: JSON.stringify(config) },
  });
  revalidate(event.id, event.slug);
  return { ok: true };
}

export async function updateSection(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const section = await sectionOfEvent(event.id, str(fd, "id"));
  if (!section) return { error: "Section not found." };
  const existing = parseJson<Record<string, unknown>>(section.config, {});
  const config = { ...existing, heading: str(fd, "heading") || null, body: str(fd, "body") || null };
  await db.eventSection.update({ where: { id: section.id }, data: { config: JSON.stringify(config) } });
  revalidate(event.id, event.slug);
  return { ok: true };
}

export async function deleteSection(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const section = await sectionOfEvent(event.id, str(fd, "id"));
  if (!section) return;
  await db.eventSection.delete({ where: { id: section.id } });
  revalidate(event.id, event.slug);
}

export async function moveSection(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const section = await sectionOfEvent(event.id, str(fd, "id"));
  if (!section) return;
  const dir = str(fd, "dir");
  const siblings = await db.eventSection.findMany({ where: { pageId: section.pageId }, orderBy: { order: "asc" } });
  const idx = siblings.findIndex((s) => s.id === section.id);
  const swap = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swap) return;
  await db.$transaction([
    db.eventSection.update({ where: { id: section.id }, data: { order: swap.order } }),
    db.eventSection.update({ where: { id: swap.id }, data: { order: section.order } }),
  ]);
  revalidate(event.id, event.slug);
}

// --- Pages -----------------------------------------------------------------

export async function createPage(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const title = str(fd, "title");
  if (!title) return { error: "Page title is required." };
  let key = slugify(title) || "page";
  if (await db.eventPage.findFirst({ where: { eventId: event.id, key } })) {
    key = `${key}-${Date.now().toString(36).slice(-4)}`;
  }
  const max = await db.eventPage.aggregate({ where: { eventId: event.id }, _max: { navOrder: true } });
  await db.eventPage.create({
    data: { eventId: event.id, key, title, navOrder: (max._max.navOrder ?? -1) + 1, published: false },
  });
  revalidate(event.id, event.slug);
  return { ok: true };
}

export async function updatePage(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const page = await pageOfEvent(event.id, str(fd, "id"));
  if (!page) return { error: "Page not found." };
  const title = str(fd, "title");
  if (!title) return { error: "Page title is required." };
  await db.eventPage.update({ where: { id: page.id }, data: { title } });
  revalidate(event.id, event.slug);
  return { ok: true };
}

export async function togglePagePublished(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const page = await pageOfEvent(event.id, str(fd, "id"));
  if (!page) return;
  await db.eventPage.update({ where: { id: page.id }, data: { published: !page.published } });
  revalidate(event.id, event.slug);
}

export async function movePage(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const page = await pageOfEvent(event.id, str(fd, "id"));
  if (!page) return;
  const dir = str(fd, "dir");
  const siblings = await db.eventPage.findMany({ where: { eventId: event.id }, orderBy: { navOrder: "asc" } });
  const idx = siblings.findIndex((p) => p.id === page.id);
  const swap = dir === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swap) return;
  await db.$transaction([
    db.eventPage.update({ where: { id: page.id }, data: { navOrder: swap.navOrder } }),
    db.eventPage.update({ where: { id: swap.id }, data: { navOrder: page.navOrder } }),
  ]);
  revalidate(event.id, event.slug);
}

export async function deletePage(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const page = await pageOfEvent(event.id, str(fd, "id"));
  if (!page || page.isHome) return; // never delete the home page
  await db.eventPage.delete({ where: { id: page.id } });
  revalidate(event.id, event.slug);
}

export async function publishAllPages(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  await db.eventPage.updateMany({ where: { eventId: event.id }, data: { published: true } });
  revalidate(event.id, event.slug);
}
