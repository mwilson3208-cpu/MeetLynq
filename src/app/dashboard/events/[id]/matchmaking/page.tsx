import {
  Sparkles,
  Users,
  Gauge,
  Flame,
  ArrowLeftRight,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { parseJson } from "@/lib/utils";
import { labelOf, FIT_TYPES } from "@/lib/constants";
import { StatCard, Avatar, Progress, Separator, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MatchRules = {
  allowBuyerSeller?: boolean;
  allowInvestorFounder?: boolean;
  minScore?: number;
};

export default async function MatchmakingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const matches = await db.matchScore.findMany({
    where: { eventId: id },
    include: { participantA: true, participantB: true },
    orderBy: { score: "desc" },
    take: 40,
  });

  const total = matches.length;
  const averageScore = total
    ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / total)
    : 0;
  const highFit = matches.filter((m) => m.score > 80).length;

  const rules = parseJson<MatchRules>(event.matchRules, {});
  const ruleRows: { label: string; on: boolean }[] = [
    { label: "Allow buyer / seller intros", on: rules.allowBuyerSeller ?? true },
    { label: "Allow investor / founder intros", on: rules.allowInvestorFounder ?? true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI matchmaking</h2>
          <p className="text-sm text-muted-foreground">
            Top scored connections between participants. All suggestions are reviewable
            and overridable by the organizer.
          </p>
        </div>
        <Button>
          <Wand2 /> Run matchmaking
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total matches" value={total} icon={<Users />} />
        <StatCard label="Average score" value={averageScore} icon={<Gauge />} tone="info" />
        <StatCard label="High-fit (>80)" value={highFit} icon={<Flame />} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Organizer match rules
          </CardTitle>
          <CardDescription>
            Constraints applied before AI scoring. Organizers can manually override any
            suggested match.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {ruleRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span className="text-muted-foreground">{r.label}</span>
                <Badge tone={r.on ? "success" : "neutral"}>{r.on ? "On" : "Off"}</Badge>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span className="text-muted-foreground">Minimum score</span>
              <Badge tone="info">{rules.minScore ?? 0}</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Organizers can manually override AI suggestions at any time.
          </p>
        </CardContent>
      </Card>

      {total === 0 ? (
        <EmptyState
          icon={<Sparkles />}
          title="No matches yet"
          description="Run matchmaking to generate AI-scored connections between your participants."
          action={
            <Button>
              <Wand2 /> Run matchmaking
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((m) => {
            const interests = parseJson<string[]>(m.mutualInterests, []);
            return (
              <Card key={m.id} className="flex flex-col">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={m.participantA.name}
                        src={m.participantA.photoUrl}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.participantA.name}
                        </p>
                        {m.participantA.companyName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {m.participantA.companyName}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0 text-right">
                        <p className="truncate text-sm font-medium">
                          {m.participantB.name}
                        </p>
                        {m.participantB.companyName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {m.participantB.companyName}
                          </p>
                        )}
                      </div>
                      <Avatar
                        name={m.participantB.name}
                        src={m.participantB.photoUrl}
                        size={40}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-end justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Match score
                      </span>
                      <span className="text-2xl font-semibold tracking-tight">
                        {m.score}
                      </span>
                    </div>
                    <Progress value={m.score} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.fitType && (
                      <Badge tone="primary">{labelOf(FIT_TYPES, m.fitType)}</Badge>
                    )}
                    {m.overridden && <Badge tone="warning">Overridden</Badge>}
                    {interests.map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {m.reason && (
                    <p className="text-sm text-muted-foreground">{m.reason}</p>
                  )}

                  <Separator />

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {m.suggestedMessage && (
                      <p>
                        <span className="font-medium text-foreground">
                          Suggested opener:
                        </span>{" "}
                        {m.suggestedMessage}
                      </p>
                    )}
                    {m.suggestedGoal && (
                      <p>
                        <span className="font-medium text-foreground">Goal:</span>{" "}
                        {m.suggestedGoal}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm">Introduce</Button>
                    <Button size="sm" variant="outline">
                      Override
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
