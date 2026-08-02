"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/queries";
import { API_KEY_PROVIDER } from "./constants";

type MutationState = { ok?: boolean; error?: string } | null;

const PROVIDERS = new Set(["hubspot", "salesforce", "zoho", "airtable", "zapier"]);
const WEBHOOK_EVENTS = new Set([
  "registration.created",
  "registration.confirmed",
  "meeting.booked",
  "lead.captured",
  "survey.response",
]);


export async function connectIntegration(fd: FormData): Promise<void> {
  const { org } = await requireOrg();
  const provider = String(fd.get("provider") ?? "");
  if (!PROVIDERS.has(provider)) return;
  const existing = await db.integration.findFirst({ where: { organizationId: org.id, provider } });
  if (existing) {
    await db.integration.update({ where: { id: existing.id }, data: { status: "CONNECTED" } });
  } else {
    await db.integration.create({ data: { organizationId: org.id, provider, status: "CONNECTED" } });
  }
  revalidatePath("/dashboard/integrations");
}

export async function disconnectIntegration(fd: FormData): Promise<void> {
  const { org } = await requireOrg();
  const provider = String(fd.get("provider") ?? "");
  const existing = await db.integration.findFirst({ where: { organizationId: org.id, provider } });
  if (existing) {
    await db.integration.update({ where: { id: existing.id }, data: { status: "DISCONNECTED" } });
  }
  revalidatePath("/dashboard/integrations");
}

export async function addWebhook(_prev: MutationState, fd: FormData): Promise<MutationState> {
  const { org } = await requireOrg();
  const url = String(fd.get("url") ?? "").trim().slice(0, 500);
  const event = String(fd.get("event") ?? "");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
  } catch {
    return { error: "Please enter a valid http(s) endpoint URL." };
  }
  if (!WEBHOOK_EVENTS.has(event)) return { error: "Pick a valid event type." };
  await db.webhook.create({ data: { organizationId: org.id, url, event } });
  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

export async function deleteWebhook(fd: FormData): Promise<void> {
  const { org } = await requireOrg();
  const id = String(fd.get("id") ?? "");
  await db.webhook.deleteMany({ where: { id, organizationId: org.id } });
  revalidatePath("/dashboard/integrations");
}

/** Rotate the workspace API key (stored in an Integration row's config). */
export async function regenerateApiKey(): Promise<void> {
  const { org } = await requireOrg();
  const key = `mlq_live_${randomBytes(18).toString("base64url")}`;
  const existing = await db.integration.findFirst({
    where: { organizationId: org.id, provider: API_KEY_PROVIDER },
  });
  if (existing) {
    await db.integration.update({
      where: { id: existing.id },
      data: { config: JSON.stringify({ key }), status: "CONNECTED" },
    });
  } else {
    await db.integration.create({
      data: {
        organizationId: org.id,
        provider: API_KEY_PROVIDER,
        status: "CONNECTED",
        config: JSON.stringify({ key }),
      },
    });
  }
  revalidatePath("/dashboard/integrations");
}
