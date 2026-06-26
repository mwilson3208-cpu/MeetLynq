import { Building2, Plus, Sparkles, Users, Gauge, Eye, EyeOff } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { StatCard, Avatar, Progress, EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SPONSOR_LEVELS } from "@/lib/constants";

export default async function SponsorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const sponsors = await db.sponsor.findMany({
    where: { eventId: id },
    include: { _count: { select: { leads: true } } },
    orderBy: { valueScore: "desc" },
  });

  const totalLeads = sponsors.reduce((sum, s) => sum + s._count.leads, 0);
  const avgValue = sponsors.length
    ? Math.round(sponsors.reduce((sum, s) => sum + s.valueScore, 0) / sponsors.length)
    : 0;

  const aiPackage = await generate("sponsor_package", { name: event.name });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sponsors</h2>
          <p className="text-sm text-muted-foreground">
            Manage sponsorship tiers, value, and captured leads.
          </p>
        </div>
        <Button variant="primary">
          <Plus /> Add sponsor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sponsors" value={sponsors.length} icon={<Building2 />} />
        <StatCard label="Total leads" value={totalLeads} icon={<Users />} tone="success" />
        <StatCard label="Avg value score" value={avgValue} icon={<Gauge />} tone="info" />
      </div>

      {sponsors.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <EmptyState
              icon={<Building2 />}
              title="No sponsors yet"
              description="Add sponsors to showcase partners, track their value, and attribute captured leads."
              action={
                <Button variant="primary">
                  <Plus /> Add sponsor
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((s) => {
            const meta = SPONSOR_LEVELS[s.level] ?? { label: s.level, tone: "neutral" as const };
            return (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} src={s.logoUrl} size={40} />
                      <div>
                        <CardTitle>{s.name}</CardTitle>
                        <Badge tone={meta.tone} className="mt-1">
                          {meta.label}
                        </Badge>
                      </div>
                    </div>
                    <Badge tone={s.visible ? "success" : "neutral"}>
                      {s.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      {s.visible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {s.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
                  )}
                  <div>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-muted-foreground">Sponsor value score</span>
                      <span className="font-medium">{s.valueScore}</span>
                    </div>
                    <Progress value={s.valueScore} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {s._count.leads} lead{s._count.leads === 1 ? "" : "s"} captured
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
            <Sparkles className="size-4 text-primary" /> AI sponsor package
          </CardTitle>
          <CardDescription>
            Draft prospectus copy for {event.name}. Reviewable and editable before you send it to
            prospects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 text-sm leading-relaxed">
            {aiPackage.output}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
