import { ClipboardList, Plus, Sparkles, Star, MessageSquare } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/lib/constants";

const SURVEY_KIND: Record<string, string> = {
  POST_EVENT: "Post-event",
  SESSION: "Session",
  SPONSOR: "Sponsor",
  NPS: "NPS",
};

const SURVEY_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  LIVE: { label: "Live", tone: "success" },
  CLOSED: { label: "Closed", tone: "info" },
};

const QUESTION_TYPE: Record<string, string> = {
  RATING: "Rating",
  TEXT: "Text",
  CHOICE: "Choice",
  NPS: "NPS",
};

export default async function SurveysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const surveys = await db.survey.findMany({
    where: { eventId: id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Average rating per survey, from RATING-type question responses.
  const avgRatings = new Map<string, number | null>();
  for (const survey of surveys) {
    const ratingQ = survey.questions.filter((q) => q.type === "RATING").map((q) => q.id);
    if (ratingQ.length === 0) {
      avgRatings.set(survey.id, null);
      continue;
    }
    const responses = await db.surveyResponse.findMany({
      where: { surveyId: survey.id, questionId: { in: ratingQ } },
    });
    const nums = responses
      .map((r) => Number(r.value))
      .filter((n) => Number.isFinite(n));
    avgRatings.set(
      survey.id,
      nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
    );
  }

  const aiInsights = await generate("survey_insights");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Surveys</h2>
          <p className="text-sm text-muted-foreground">
            Collect feedback and measure satisfaction across your event.
          </p>
        </div>
        <Button variant="primary">
          <Plus /> Create survey
        </Button>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <EmptyState
              icon={<ClipboardList />}
              title="No surveys yet"
              description="Build a post-event, session, or NPS survey to capture attendee sentiment and uncover what to improve."
              action={
                <Button variant="primary">
                  <Plus /> Create survey
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {surveys.map((s) => {
            const status = SURVEY_STATUS[s.status] ?? { label: s.status, tone: "neutral" as const };
            const avg = avgRatings.get(s.id) ?? null;
            return (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{s.title}</CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{SURVEY_KIND[s.kind] ?? s.kind}</Badge>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="size-4" />
                        {s._count.responses} response{s._count.responses === 1 ? "" : "s"}
                      </span>
                      {avg !== null && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Star className="size-4 text-warning-foreground" />
                          {avg.toFixed(1)} avg
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {s.questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions added yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {s.questions.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                        >
                          <span>{q.prompt}</span>
                          <Badge tone="neutral">{QUESTION_TYPE[q.type] ?? q.type}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> AI survey insights
          </CardTitle>
          <CardDescription>
            Summarized themes from collected responses. Reviewable and editable before you share.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 text-sm leading-relaxed">
            {aiInsights.output}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
