"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  let userId: string;
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { error: "Invalid email or password." };
    }
    userId = user.id;
    await createSession(userId);
  } catch (err) {
    console.error("[login]", err);
    return { error: "We couldn't sign you in right now. Please try again in a moment." };
  }
  redirect("/dashboard");
}

export async function demoLogin() {
  const user = await db.user.findUnique({ where: { email: "organizer@meetlynq.com" } });
  if (!user) redirect("/signup");
  await createSession(user.id);
  redirect("/dashboard");
}

// Public endpoint — validate/bound inputs server-side, not just in the browser.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(_prev: unknown, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").toLowerCase().trim().slice(0, 254);
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("organization") ?? "").trim().slice(0, 120) || `${name}'s workspace`;

  if (!name || !email || password.length < 6) {
    return { error: "Please provide a name, email, and a password of at least 6 characters." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length > 200) {
    return { error: "That password is too long — please use fewer than 200 characters." };
  }
  try {
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
  } catch (err) {
    // Unique-constraint race: two signups with the same email at once.
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      return { error: "An account with that email already exists." };
    }
    console.error("[signup]", err);
    return { error: "We couldn't create your account right now. Please try again in a moment." };
  }
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
