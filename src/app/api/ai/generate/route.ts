import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generate, type AiTask } from "@/lib/ai";

export const dynamic = "force-dynamic";

const VALID_TASKS: AiTask[] = [
  "event_description",
  "page_copy",
  "speaker_bio",
  "sponsor_package",
  "registration_questions",
  "match_message",
  "follow_up_email",
  "post_event_summary",
  "sponsor_roi_summary",
  "survey_insights",
];

// Controlled AI generation endpoint. Output is always returned for organizer
// review — it is never auto-published.
export async function POST(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("[ai-generate:auth]", err);
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // JSON.parse("null"), a bare array, string, or number are all valid JSON but
  // not the object we need — reject them instead of dereferencing.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { task, input } = body as { task?: unknown; input?: unknown };
  if (typeof task !== "string" || !VALID_TASKS.includes(task as AiTask)) {
    return NextResponse.json({ error: "Unknown AI task" }, { status: 400 });
  }

  // Coerce input to a flat string map so the generator never sees objects,
  // arrays, or non-string values (which would stringify to "[object Object]").
  const safeInput: Record<string, string> = {};
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v == null) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        safeInput[k] = String(v).slice(0, 2000);
      }
    }
  }

  const result = await generate(task as AiTask, safeInput);
  return NextResponse.json({ ...result, reviewable: true });
}
