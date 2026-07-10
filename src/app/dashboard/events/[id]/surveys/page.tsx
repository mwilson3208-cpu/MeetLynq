import { ClipboardList, Sparkles, Star, MessageSquare, Gauge, ExternalLink } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { parseJson } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Field, Select, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import type { Tone } from "@/lib/constants";
import {
  createSurvey,
  updateSurvey,
  setSurveyStatus,
  deleteSurvey,
  addQuestion,
  deleteQuestion,
} from "./actions";

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

function kindField(defaultValue = "POST_EVENT") {
  return (
    <Field label="Survey type">
      <Select name="kind" defaultValue={defaultValue}>
        {Object.entries(SURVEY_KIND).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export default async function SurveysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const surveys = await db.survey.findMany({
    where: { eventId: id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute avg rating + NPS per survey from its responses.
  const stats = new Map<string, { avg: number | null; nps: number | null; npsCount: number }>();
  for (const survey of surveys) {
    const ratingIds = survey.questions.filter((q) => q.type === "RATING").map((q) => q.id);
    const npsIds = survey.questions.filter((q) => q.type === "NPS").map((q) => q.id);

    const wanted = [...ratingIds, ...npsIds];
    const responses = wanted.length
      ? await db.surveyResponse.findMany({ where: { surveyId: survey.id, questionId: { in: wanted } } })
      : [];

    const ratingNums = responses
      .filter((r) => ratingIds.includes(r.questionId))
      .map((r) => Number(r.value))
      .filter((n) => Number.isFinite(n));
    const avg = ratingNums.length
      ? Math.round((ratingNums.reduce((a, b) => a + b, 0) / ratingNums.length) * 10) / 10
      : null;

    const npsNums = responses
      .filter((r) => npsIds.includes(r.questionId))
      .map((r) => Number(r.value))
      .filter((n) => Number.isFinite(n));
    let nps: number | null = null;
    if (npsNums.length) {
      const promoters = npsNums.filter((n) => n >= 9).length;
      const detractors = npsNums.filter((n) => n <= 6).length;
      nps = Math.round(((promoters - detractors) / npsNums.length) * 100);
    }

    stats.set(survey.id, { avg, nps, npsCount: npsNums.length });
  }

  const aiInsights = await generate("survey_insights");

  const createDialog = (
    <FormDialog
      buttonLabel="Create survey"
      title="Create survey"
      description="Start a post-event, session, sponsor, or NPS survey. A starter question is added for you."
      action={createSurvey}
      submitLabel="Create survey"
    >
      <input type="hidden" name="eventId" value={id} />
      <Field label="Title">
        <Input name="title" placeholder="Post-event feedback" required />
      </Field>
      {kindField()}
    </FormDialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Surveys</h2>
          <p className="text-sm text-muted-foreground">
            Collect feedback and measure satisfaction across your event.
          </p>
        </div>
        {createDialog}
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <EmptyState
              icon={<ClipboardList />}
              title="No surveys yet"
              description="Build a post-event, session, or NPS survey to capture attendee sentiment and uncover what to improve."
              action={createDialog}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {surveys.map((s) => {
            const status = SURVEY_STATUS[s.status] ?? { label: s.status, tone: "neutral" as const };
            const st = stats.get(s.id) ?? { avg: null, nps: null, npsCount: 0 };
            const respondUrl = `/e/${event.slug}/survey/${s.id}`;
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
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="size-4" />
                        {s._count.responses} response{s._count.responses === 1 ? "" : "s"}
                      </span>
                      {st.avg !== null && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Star className="size-4 text-warning-foreground" />
                          {st.avg.toFixed(1)} avg
                        </span>
                      )}
                      {st.nps !== null && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Gauge className="size-4 text-primary" />
                          {st.nps > 0 ? "+" : ""}
                          {st.nps} NPS
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {s.questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions added yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {s.questions.map((q) => {
                        const options = parseJson<string[]>(q.options, []);
                        return (
                          <li
                            key={q.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                          >
                            <div className="min-w-0">
                              <span>{q.prompt}</span>
                              {options.length > 0 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({options.join(", ")})
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Badge tone="neutral">{QUESTION_TYPE[q.type] ?? q.type}</Badge>
                              <DeleteButton
                                action={deleteQuestion}
                                id={q.id}
                                eventId={id}
                                confirmText="Remove this question?"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <AddQuestionDialog eventId={id} surveyId={s.id} />
                    <EditSurveyDialog eventId={id} survey={s} />

                    {s.status !== "LIVE" && (
                      <StatusForm eventId={id} surveyId={s.id} status="LIVE" label="Publish" variant="primary" />
                    )}
                    {s.status === "LIVE" && (
                      <StatusForm eventId={id} surveyId={s.id} status="CLOSED" label="Close" variant="outline" />
                    )}
                    {s.status === "CLOSED" && (
                      <StatusForm eventId={id} surveyId={s.id} status="DRAFT" label="Reopen as draft" variant="outline" />
                    )}

                    {s.status === "LIVE" && (
                      <ButtonLink href={respondUrl} variant="ghost" size="sm" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" /> Respondent link
                      </ButtonLink>
                    )}

                    <div className="ml-auto">
                      <DeleteButton
                        action={deleteSurvey}
                        id={s.id}
                        eventId={id}
                        confirmText="Delete this survey and all its responses? This can't be undone."
                        label="Delete"
                      />
                    </div>
                  </div>
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

function StatusForm({
  eventId,
  surveyId,
  status,
  label,
  variant,
}: {
  eventId: string;
  surveyId: string;
  status: string;
  label: string;
  variant: "primary" | "outline";
}) {
  return (
    <form action={setSurveyStatus}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="surveyId" value={surveyId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

function AddQuestionDialog({ eventId, surveyId }: { eventId: string; surveyId: string }) {
  return (
    <FormDialog
      buttonLabel="Add question"
      title="Add question"
      description="Add a rating, text, multiple-choice, or NPS question."
      action={addQuestion}
      submitLabel="Add question"
      buttonSize="sm"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="surveyId" value={surveyId} />
      <Field label="Question">
        <Input name="prompt" placeholder="What did you think of the keynote?" required />
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue="RATING">
          {Object.entries(QUESTION_TYPE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Choices" hint="Only for multiple-choice — one option per line.">
        <Textarea name="options" rows={3} placeholder={"Excellent\nGood\nNeeds work"} />
      </Field>
    </FormDialog>
  );
}

function EditSurveyDialog({
  eventId,
  survey,
}: {
  eventId: string;
  survey: { id: string; title: string; kind: string };
}) {
  return (
    <FormDialog
      buttonLabel="Edit survey"
      title="Edit survey"
      action={updateSurvey}
      submitLabel="Save changes"
      buttonSize="sm"
      mode="edit"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="surveyId" value={survey.id} />
      <Field label="Title">
        <Input name="title" defaultValue={survey.title} required />
      </Field>
      {kindField(survey.kind)}
    </FormDialog>
  );
}
