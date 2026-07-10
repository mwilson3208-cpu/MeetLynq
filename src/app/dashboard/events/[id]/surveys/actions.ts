"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";

type State = { ok?: boolean; error?: string };

const SURVEY_KINDS = new Set(["POST_EVENT", "SESSION", "SPONSOR", "NPS"]);
const SURVEY_STATUSES = new Set(["DRAFT", "LIVE", "CLOSED"]);
const QUESTION_TYPES = new Set(["RATING", "TEXT", "CHOICE", "NPS"]);

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function revalidate(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/surveys`);
  revalidatePath(`/dashboard/events/${eventId}/reports`);
}

/** Verify the survey belongs to an event the current org owns. */
async function getSurveyOr404(fd: FormData) {
  const event = await getEventOr404(str(fd, "eventId"));
  const survey = await db.survey.findFirst({ where: { id: str(fd, "surveyId"), eventId: event.id } });
  return { event, survey };
}

export async function createSurvey(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const title = str(fd, "title");
  if (!title) return { error: "Give your survey a title." };
  const kind = str(fd, "kind");
  if (!SURVEY_KINDS.has(kind)) return { error: "Pick a survey type." };

  // NPS surveys get a starter 0–10 question; others get a satisfaction rating.
  const starter =
    kind === "NPS"
      ? { prompt: "How likely are you to recommend this event to a colleague?", type: "NPS", order: 0 }
      : { prompt: "How would you rate your overall experience?", type: "RATING", order: 0 };

  await db.survey.create({
    data: {
      eventId: event.id,
      title,
      kind,
      status: "DRAFT",
      questions: { create: [starter] },
    },
  });
  revalidate(event.id);
  return { ok: true };
}

export async function updateSurvey(_prev: State | null, fd: FormData): Promise<State> {
  const { event, survey } = await getSurveyOr404(fd);
  if (!survey) return { error: "Survey not found." };
  const title = str(fd, "title");
  if (!title) return { error: "Give your survey a title." };
  const kind = str(fd, "kind");
  if (!SURVEY_KINDS.has(kind)) return { error: "Pick a survey type." };
  await db.survey.update({ where: { id: survey.id }, data: { title, kind } });
  revalidate(event.id);
  return { ok: true };
}

/** Publish (LIVE) / close (CLOSED) / revert to draft — plain form action. */
export async function setSurveyStatus(fd: FormData): Promise<void> {
  const { event, survey } = await getSurveyOr404(fd);
  if (!survey) return;
  const status = str(fd, "status");
  if (!SURVEY_STATUSES.has(status)) return;
  // Don't publish an empty survey.
  if (status === "LIVE") {
    const count = await db.surveyQuestion.count({ where: { surveyId: survey.id } });
    if (count === 0) return;
  }
  await db.survey.update({ where: { id: survey.id }, data: { status } });
  revalidate(event.id);
}

export async function deleteSurvey(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  await db.survey.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidate(event.id);
}

export async function addQuestion(_prev: State | null, fd: FormData): Promise<State> {
  const { event, survey } = await getSurveyOr404(fd);
  if (!survey) return { error: "Survey not found." };
  const prompt = str(fd, "prompt");
  if (!prompt) return { error: "Enter a question." };
  const type = str(fd, "type");
  if (!QUESTION_TYPES.has(type)) return { error: "Pick a question type." };

  const options =
    type === "CHOICE"
      ? str(fd, "options")
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];
  if (type === "CHOICE" && options.length < 2) {
    return { error: "Add at least two choices, one per line." };
  }

  const last = await db.surveyQuestion.findFirst({
    where: { surveyId: survey.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.surveyQuestion.create({
    data: {
      surveyId: survey.id,
      prompt,
      type,
      options: JSON.stringify(options),
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidate(event.id);
  return { ok: true };
}

export async function deleteQuestion(fd: FormData): Promise<void> {
  const { event, survey } = await getSurveyOr404(fd);
  if (!survey) return;
  await db.surveyQuestion.deleteMany({ where: { id: str(fd, "id"), surveyId: survey.id } });
  revalidate(event.id);
}
