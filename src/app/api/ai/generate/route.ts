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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { task?: string; input?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.task || !VALID_TASKS.includes(body.task as AiTask)) {
    return NextResponse.json({ error: "Unknown AI task" }, { status: 400 });
  }

  const result = await generate(body.task as AiTask, body.input ?? {});
  return NextResponse.json({ ...result, reviewable: true });
}
