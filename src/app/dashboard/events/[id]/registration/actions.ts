"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { isFieldType, isChoiceType, normalizeOptions, parseOptions, type FieldDTO } from "@/lib/registration-fields";
import {
  REGISTRATION_SETTINGS,
  type RegistrationSettingKey,
  type ToggleState,
} from "./settings";

const MAX_LABEL = 120;
const MAX_FIELDS = 30;

export type FieldActionState = { ok?: boolean; error?: string; fields?: FieldDTO[] } | null;

/** Current custom fields for an event, in display order. */
async function listFields(eventId: string): Promise<FieldDTO[]> {
  const rows = await db.registrationField.findMany({ where: { eventId }, orderBy: { order: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    type: r.type,
    required: r.required,
    options: parseOptions(r.options),
  }));
}

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

function revalidate(eventId: string, slug: string) {
  revalidatePath(`/dashboard/events/${eventId}/registration`);
  revalidatePath(`/e/${slug}`);
}

/** Add a custom registration field to the event's form. */
export async function addRegistrationField(_prev: FieldActionState, fd: FormData): Promise<FieldActionState> {
  const event = await getEventOr404(String(fd.get("eventId") ?? ""));

  const label = String(fd.get("label") ?? "").trim().slice(0, MAX_LABEL);
  if (!label) return { error: "Give the field a label." };

  const type = String(fd.get("type") ?? "TEXT");
  if (!isFieldType(type)) return { error: "Unknown field type." };

  const required = String(fd.get("required") ?? "") === "true";
  const options = normalizeOptions(type, String(fd.get("options") ?? ""));
  if (isChoiceType(type) && (!options || options.length < 2)) {
    return { error: "Add at least two options for a choice field." };
  }

  const count = await db.registrationField.count({ where: { eventId: event.id } });
  if (count >= MAX_FIELDS) return { error: `You can add up to ${MAX_FIELDS} custom fields.` };

  try {
    await db.registrationField.create({
      data: {
        eventId: event.id,
        label,
        type,
        required,
        options: options ? JSON.stringify(options) : null,
        order: count,
      },
    });
  } catch (err) {
    console.error("[addRegistrationField]", err);
    return { error: "Couldn't add that field. Please try again." };
  }

  revalidate(event.id, event.slug);
  return { ok: true, fields: await listFields(event.id) };
}

/** Delete a custom registration field. */
export async function deleteRegistrationField(_prev: FieldActionState, fd: FormData): Promise<FieldActionState> {
  const event = await getEventOr404(String(fd.get("eventId") ?? ""));
  const fieldId = String(fd.get("fieldId") ?? "");

  try {
    // Scope the delete to this event so a field id from another event can't be removed.
    await db.registrationField.deleteMany({ where: { id: fieldId, eventId: event.id } });
  } catch (err) {
    console.error("[deleteRegistrationField]", err);
    return { error: "Couldn't delete that field. Please try again." };
  }

  revalidate(event.id, event.slug);
  return { ok: true, fields: await listFields(event.id) };
}

/** Toggle whether a custom field is required. */
export async function setFieldRequired(_prev: FieldActionState, fd: FormData): Promise<FieldActionState> {
  const event = await getEventOr404(String(fd.get("eventId") ?? ""));
  const fieldId = String(fd.get("fieldId") ?? "");
  const required = String(fd.get("required") ?? "") === "true";

  try {
    await db.registrationField.updateMany({ where: { id: fieldId, eventId: event.id }, data: { required } });
  } catch (err) {
    console.error("[setFieldRequired]", err);
    return { error: "Couldn't update that field. Please try again." };
  }

  revalidate(event.id, event.slug);
  return { ok: true, fields: await listFields(event.id) };
}

/** Persist a new field ordering. `orderedIds` is the full list of field ids in display order. */
export async function reorderRegistrationFields(eventId: string, orderedIds: string[]): Promise<FieldActionState> {
  const event = await getEventOr404(eventId);

  // Only reorder ids that actually belong to this event.
  const owned = new Set(
    (await db.registrationField.findMany({ where: { eventId: event.id }, select: { id: true } })).map((f) => f.id),
  );
  const ids = orderedIds.filter((id) => owned.has(id));

  try {
    await db.$transaction(
      ids.map((id, index) =>
        db.registrationField.update({ where: { id }, data: { order: index } }),
      ),
    );
  } catch (err) {
    console.error("[reorderRegistrationFields]", err);
    return { error: "Couldn't save the new order. Please try again." };
  }

  revalidate(event.id, event.slug);
  return { ok: true, fields: await listFields(event.id) };
}
