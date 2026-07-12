"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import {
  REGISTRATION_SETTINGS,
  type RegistrationSettingKey,
  type ToggleState,
} from "./settings";

/** Persist a single registration-setup toggle for an event. */
export async function setRegistrationSetting(
  _prev: ToggleState,
  fd: FormData,
): Promise<ToggleState> {
  const eventId = String(fd.get("eventId") ?? "");
  const key = String(fd.get("key") ?? "");
  const enabled = String(fd.get("enabled") ?? "") === "true";

  if (!REGISTRATION_SETTINGS.includes(key as RegistrationSettingKey)) {
    return { error: "Unknown setting." };
  }

  // getEventOr404 scopes to the caller's organization and 404s otherwise.
  const event = await getEventOr404(eventId);

  try {
    await db.event.update({
      where: { id: event.id },
      data: { [key]: enabled },
    });
  } catch (err) {
    console.error("[setRegistrationSetting]", err);
    return { error: "Couldn't save that change. Please try again." };
  }

  revalidatePath(`/dashboard/events/${event.id}/registration`);
  revalidatePath(`/e/${event.slug}`);
  return { ok: true };
}
