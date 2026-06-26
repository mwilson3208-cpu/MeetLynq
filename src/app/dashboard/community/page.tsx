import { Users, CalendarDays, MessagesSquare, Sparkles, MapPin, ArrowUpRight } from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, StatCard, EmptyState, Avatar } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CommunityPage() {
  const { org } = await requireOrg();

  const [memberCount, eventsHosted, conversations, members] = await Promise.all([
    db.participant.count({ where: { event: { organizationId: org.id } } }),
    db.event.count({ where: { organizationId: org.id } }),
    db.conversation.count({ where: { event: { organizationId: org.id } } }),
    db.participant.findMany({
      where: { event: { organizationId: org.id } },
      take: 24,
      orderBy: { intentScore: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Community"
        description="Keep your audience connected year-round, between events."
        action={
          <Button>
            <ArrowUpRight className="size-4" /> Open community
          </Button>
        }
      />

      <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-accent/60 to-card">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Always-on networking</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Your community doesn&apos;t end when the event does. Members keep their profiles,
              discover new matches, and book meetings all year — turning each event into a
              lasting relationship engine.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Members" value={memberCount} icon={<Users />} />
        <StatCard label="Events hosted" value={eventsHosted} icon={<CalendarDays />} tone="info" />
        <StatCard label="Conversations" value={conversations} icon={<MessagesSquare />} tone="success" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Members directory</h2>
          <p className="text-sm text-muted-foreground">Top members by intent</p>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No community members yet"
            description="As people register and build profiles across your events, they'll appear here ready to connect."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-col items-center p-5 text-center">
                  <Avatar name={m.name} src={m.photoUrl} size={56} />
                  <p className="mt-3 font-semibold leading-tight">{m.name}</p>
                  {(m.title || m.companyName) && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {m.title ?? "—"}
                      {m.companyName ? ` @ ${m.companyName}` : ""}
                    </p>
                  )}
                  {m.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {m.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
