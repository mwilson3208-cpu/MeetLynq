"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";

type MutationState = { ok?: boolean; error?: string } | null;

/** Save the speaker's editable profile fields from the speaker portal. */
export async function saveSpeakerProfile(_prev: MutationState, fd: FormData): Promise<MutationState> {
  const id = String(fd.get("speakerId") ?? "");
  const speaker = await db.speaker.findUnique({ where: { id } });
  if (!speaker) return { error: "Speaker profile not found." };
  await db.speaker.update({
    where: { id },
    data: {
      title: String(fd.get("title") ?? "").trim().slice(0, 120) || null,
      bio: String(fd.get("bio") ?? "").trim().slice(0, 2000) || null,
      sessionDescription: String(fd.get("sessionDescription") ?? "").trim().slice(0, 2000) || null,
    },
  });
  revalidatePath("/speaker-portal");
  return { ok: true };
}

/** Add a resource link (slides, docs) to the speaker's resource list. */
export async function addSpeakerResource(_prev: MutationState, fd: FormData): Promise<MutationState> {
  const id = String(fd.get("speakerId") ?? "");
  const label = String(fd.get("label") ?? "").trim().slice(0, 120);
  const url = String(fd.get("url") ?? "").trim().slice(0, 500);
  if (!label) return { error: "Give the resource a name." };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
  } catch {
    return { error: "Please enter a valid http(s) link." };
  }
  const speaker = await db.speaker.findUnique({ where: { id } });
  if (!speaker) return { error: "Speaker profile not found." };
  const resources = parseJson<string[]>(speaker.resources, []);
  resources.push(`${label} — ${url}`);
  await db.speaker.update({ where: { id }, data: { resources: JSON.stringify(resources) } });
  revalidatePath("/speaker-portal");
  return { ok: true };
}
