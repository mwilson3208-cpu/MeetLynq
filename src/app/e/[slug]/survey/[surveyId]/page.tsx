import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Field, Textarea } from "@/components/ui/input";
import { submitSurveyResponse } from "./actions";

export const dynamic = "force-dynamic";

function Shell({ eventName, children }: { eventName: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-2">
          <LogoMark />
          <span className="font-semibold">{eventName}</span>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">{children}</main>
    </div>
  );
}

function ScaleRadios({ questionId, from, to }: { questionId: string; from: number; to: number }) {
  const nums = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <div className="flex flex-wrap gap-2">
      {nums.map((n) => (
        <label
          key={n}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
        >
          <input type="radio" name={`q_${questionId}`} value={String(n)} className="sr-only" />
          {n}
        </label>
      ))}
    </div>
  );
}

export default async function SurveyRespondPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; surveyId: string }>;
  searchParams: Promise<{ done?: string; closed?: string }>;
}) {
  const { slug, surveyId } = await params;
  const sp = await searchParams;

  const event = await db.event.findUnique({ where: { slug } });
  if (!event) notFound();

  const survey = await db.survey.findFirst({
    where: { id: surveyId, eventId: event.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) notFound();

  if (sp.done) {
    return (
      <Shell eventName={event.name}>
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Thank you!</h1>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
              Your feedback for {event.name} has been recorded. It helps the organizers make the next
              event even better.
            </p>
            <div className="mt-6">
              <ButtonLink href={`/e/${slug}`} variant="outline">
                Back to event
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const closed = survey.status !== "LIVE";

  return (
    <Shell eventName={event.name}>
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{survey.title}</h1>
              <p className="text-sm text-muted-foreground">Your responses are anonymous unless you add your name.</p>
            </div>
          </div>

          {closed ? (
            <div className="rounded-lg border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              This survey isn&apos;t accepting responses right now.
            </div>
          ) : survey.questions.length === 0 ? (
            <div className="rounded-lg border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              This survey doesn&apos;t have any questions yet.
            </div>
          ) : (
            <form action={submitSurveyResponse} className="space-y-6">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="surveyId" value={survey.id} />

              {survey.questions.map((q) => {
                const options = parseJson<string[]>(q.options, []);
                return (
                  <div key={q.id} className="space-y-2">
                    <p className="text-sm font-medium">{q.prompt}</p>
                    {q.type === "NPS" && <ScaleRadios questionId={q.id} from={0} to={10} />}
                    {q.type === "RATING" && <ScaleRadios questionId={q.id} from={1} to={5} />}
                    {q.type === "TEXT" && (
                      <Textarea name={`q_${q.id}`} rows={3} placeholder="Your answer…" />
                    )}
                    {q.type === "CHOICE" && (
                      <div className="space-y-2">
                        {options.map((opt) => (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                          >
                            <input type="radio" name={`q_${q.id}`} value={opt} className="size-4 accent-[hsl(243_75%_59%)]" />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Field label="Your name" hint="Optional.">
                <Input name="respondent" placeholder="Jane Doe" />
              </Field>

              <Button type="submit" className="w-full sm:w-auto">
                Submit feedback
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
