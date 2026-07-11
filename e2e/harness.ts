import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { PrismaClient } from "@prisma/client";

// Shared setup for the end-to-end suite. These tests drive the running app in a
// real browser and assert that data lands in the database, so they need:
//   E2E_BASE_URL  (default http://localhost:3000) — a running MeetLynq server
//   DATABASE_URL  — the same database that server is using
// If either is missing/unreachable, the suite skips instead of failing.

export const BASE = process.env.E2E_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const CHROME =
  process.env.E2E_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

/** Is the target server up? Used to skip the suite gracefully. */
export async function serverReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ executablePath: CHROME, headless: true });
}

/** Wait for a client component to hydrate before interacting (avoids submit races). */
export async function hydrate(page: Page, ms = 2800): Promise<void> {
  await page.waitForTimeout(ms);
}

/** True if Next.js rendered an error/crash screen. */
export async function crashed(page: Page): Promise<boolean> {
  return (await page.locator("text=/server-side exception|Application error/i").count()) > 0;
}

export async function login(ctx: BrowserContext, email: string, password: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await hydrate(page, 2000);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800);
  return page;
}

let counter = 0;
/** Deterministic-per-run unique token (no Math.random / Date.now in module scope). */
export function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-e2e${process.pid.toString(36)}${counter}`;
}
