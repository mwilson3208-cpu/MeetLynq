"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function demoLogin() {
  const user = await db.user.findUnique({ where: { email: "organizer@meetlynq.com" } });
  if (!user) redirect("/signup");
  await createSession(user.id);
  redirect("/dashboard");
}

export async function signup(_prev: unknown, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("organization") ?? "").trim() || `${name}'s workspace`;

  if (!name || !email || password.length < 6) {
    return { error: "Please provide a name, email, and a password of at least 6 characters." };
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  let slug = slugify(orgName) || "workspace";
  if (await db.organization.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "ORGANIZER",
      memberships: {
        create: {
          role: "OWNER",
          organization: { create: { name: orgName, slug } },
        },
      },
    },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
