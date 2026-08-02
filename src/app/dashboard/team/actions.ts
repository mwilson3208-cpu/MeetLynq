"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/queries";

type MutationState = { ok?: boolean; error?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITABLE_ROLES = new Set(["ADMIN", "TEAM_MEMBER", "STAFF"]);

/**
 * Add a teammate to the workspace by email. The person must already have a
 * MeetLynq account (there is no email-invitation infrastructure yet), so an
 * unknown email returns guidance instead of pretending to send an invite.
 */
export async function inviteMember(_prev: MutationState, fd: FormData): Promise<MutationState> {
  const { org } = await requireOrg();
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const role = String(fd.get("role") ?? "TEAM_MEMBER");
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (!INVITABLE_ROLES.has(role)) return { error: "Pick a valid role." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return {
      error: `No MeetLynq account exists for ${email} yet. Ask them to sign up at /signup first — then invite them here.`,
    };
  }
  const existing = await db.organizationMember.findFirst({
    where: { organizationId: org.id, userId: user.id },
  });
  if (existing) return { error: `${user.name} is already a member of this workspace.` };

  await db.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role },
  });
  await db.auditLog
    .create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: "member.added",
        entity: email,
      },
    })
    .catch(() => {});
  revalidatePath("/dashboard/team");
  return { ok: true };
}
