import { UserPlus, Users, Gauge, Search } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Avatar, StatCard, EmptyState, Separator } from "@/components/ui/misc";

export default async function DirectoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const participants = await db.participant.findMany({
    where: { eventId: id },
    orderBy: { intentScore: "desc" },
  });

  const avgIntent = participants.length
    ? Math.round(participants.reduce((sum, p) => sum + p.intentScore, 0) / participants.length)
    : 0;

  const industries = Array.from(
    new Set(participants.map((p) => p.industry).filter((i): i is string => Boolean(i)))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Participant directory</h2>
          <p className="text-sm text-muted-foreground">Browse attendee profiles and request meetings.</p>
        </div>
        <Button>
          <UserPlus className="size-4" /> Invite attendees
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Participants" value={participants.length} icon={<Users />} />
        <StatCard label="Avg intent score" value={avgIntent} icon={<Gauge />} tone="success" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, company, or interest" className="pl-9" />
        </div>
        <Select className="sm:w-56" defaultValue="">
          <option value="">All industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </Select>
      </div>

      {participants.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No participants yet"
          description="Invite attendees so they can build profiles and get matched."
          action={
            <Button>
              <UserPlus className="size-4" /> Invite attendees
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((p) => {
            const tags = parseJson<string[]>(p.interestTags, []);
            return (
              <Card key={p.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} src={p.photoUrl} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">{p.name}</p>
                        <Badge tone={p.intentScore > 70 ? "success" : "neutral"}>Intent {p.intentScore}</Badge>
                      </div>
                      {(p.title || p.companyName) && (
                        <p className="truncate text-sm text-muted-foreground">
                          {[p.title, p.companyName].filter(Boolean).join(" @ ")}
                        </p>
                      )}
                      {p.location && <p className="truncate text-xs text-muted-foreground">{p.location}</p>}
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} tone="primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {(p.lookingFor || p.offering) && (
                    <div className="space-y-1 text-sm">
                      {p.lookingFor && (
                        <p className="line-clamp-1">
                          <span className="text-muted-foreground">Looking for: </span>
                          {p.lookingFor}
                        </p>
                      )}
                      {p.offering && (
                        <p className="line-clamp-1">
                          <span className="text-muted-foreground">Offering: </span>
                          {p.offering}
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View profile
                    </Button>
                    <Button size="sm" className="flex-1">
                      Request meeting
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
