import { notFound } from "next/navigation";
import { getCurrentUser } from "./auth";

// Platform administration access. A user is a platform admin when their role
// is PLATFORM_ADMIN, or their email is on the allowlist below — allowlisted
// emails are also promoted to PLATFORM_ADMIN at signup, so the owner keeps
// admin access even on a fresh database. Extend at runtime with the
// ADMIN_EMAILS env var (comma-separated).

const BUILT_IN_ADMIN_EMAILS = ["success@entrepreneurpowernetwork.com"];

export function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...BUILT_IN_ADMIN_EMAILS, ...extra];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export function isAdminUser(user: { role: string; email: string } | null): boolean {
  if (!user) return false;
  return user.role === "PLATFORM_ADMIN" || isAdminEmail(user.email);
}

/** Load the current user and 404 unless they are a platform admin. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) notFound();
  return user!;
}
