"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Public survey submission. Anyone with the link can respond while the survey
 * is LIVE. Writes one SurveyResponse row per answered question.
 */
export async function submitSurveyResponse(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const surveyId = String(formData.get("surveyId") ?? "");

  const event = await db.event.findUnique({ where: { slug }, select: { id: true } });
  if (!event) redirect(`/e/${slug}`);

  const survey = await db.survey.findFirst({
    where: { id: surveyId, eventId: event.id },
    include: { questions: true },
  });
  if (!survey || survey.status !== "LIVE") {
    redirect(`/e/${slug}/survey/${surveyId}?closed=1`);
  }

  const respondent = String(formData.get("respondent") ?? "").trim() || null;

  const rows = survey.questions
    .map((q) => ({ q, value: String(formData.get(`q_${q.id}`) ?? "").trim() }))
    .filter((r) => r.value !== "")
    .map((r) => ({
      surveyId: survey.id,
      questionId: r.q.id,
      respondent,
      value: r.value,
    }));

  if (rows.length > 0) {
    await db.surveyResponse.createMany({ data: rows });
  }

  redirect(`/e/${slug}/survey/${surveyId}?done=1`);
}
