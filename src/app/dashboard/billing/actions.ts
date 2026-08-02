"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/queries";

const PLANS = new Set(["STARTER", "GROWTH", "SCALE", "ENTERPRISE"]);

/**
 * Switch the workspace plan. Payments run in mock mode until Stripe keys are
 * configured, so the change applies immediately with no charge.
 */
export async function setPlan(fd: FormData): Promise<void> {
  const { org } = await requireOrg();
  const plan = String(fd.get("plan") ?? "");
  if (!PLANS.has(plan) || plan === org.plan) return;
  await db.organization.update({ where: { id: org.id }, data: { plan } });
  await db.auditLog
    .create({ data: { organizationId: org.id, action: "plan.changed", entity: plan } })
    .catch(() => {});
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard");
}
