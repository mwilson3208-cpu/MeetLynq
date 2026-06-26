import {
  Sparkles,
  CalendarClock,
  CalendarDays,
  MessageSquare,
  Users2,
  MapPin,
  Clock,
  Smartphone,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { MEETING_STATUS } from "@/lib/constants";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, EmptyState, Separator } from "@/components/ui/misc";

export default async function AttendeePortalPage() {
  const event =
    (await db.event.findFirst({ where: { slug: "growthscale-summit-2026" } })) ??
    (await db.event.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!event) {
    return (
      <div className="container py-24">
        <EmptyState
          icon={<Sparkles />}
          title="No event found"
          description="Seed the database to explore the attendee portal."
        />
      </div>
    );
  }

  const me = await db.participant.findFirst({ where: { eventId: event.id } });

  const [matches, meetings, sessions, conversations] = await Promise.all([
    db.matchScore.findMany({
      where: { eventId: event.id },
      include: { participantB: true },
      orderBy: { score: "desc" },
      take: 5,
    }),
    db.meeting.findMany({
      where: { eventId: event.id },
      include: {
        slot: true,
        location: true,
        participants: { include: { participant: true } },
      },
      take: 5,
    }),
    db.session.findMany({
      where: { eventId: event.id },
      include: { speaker: true },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    db.conversation.findMany({
      where: { eventId: event.id },
      include: {
        members: { include: { participant: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
      take: 5,
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-7 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Attendee portal</p>
              <p className="truncate text-xs text-muted-foreground">{event.name}</p>
            </div>
          </div>
          {me && (
            <div className="flex items-center gap-2.5">
              <span className="hidden text-sm font-medium sm:inline">{me.name}</span>
              <Avatar name={me.name} src={me.photoUrl} size={36} />
            </div>
          )}
        </div>
      </header>

      <main className="container flex-1 py-10 lg:py-14">
        {/* Welcome */}
        <div className="mx-auto max-w-5xl">
          <Badge tone="primary" className="mb-4">
            <Sparkles className="size-3" /> Your personal event hub
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {me ? `Welcome, ${me.name}` : "Welcome"}
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-muted-foreground">
            <Smartphone className="size-4" /> Access this anywhere as a PWA — no app
            download required.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {/* Your matches */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="size-4 text-primary" /> Your matches
                </CardTitle>
                <Badge tone="neutral">{matches.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {matches.length === 0 && (
                  <p className="text-sm text-muted-foreground">No matches yet.</p>
                )}
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3"
                  >
                    <Avatar
                      name={m.participantB.name}
                      src={m.participantB.photoUrl}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{m.participantB.name}</p>
                        <Badge tone="success">{m.score}% match</Badge>
                      </div>
                      {m.reason && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {m.reason}
                        </p>
                      )}
                      <Button variant="outline" size="sm" className="mt-2">
                        Request meeting
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Your meetings */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" /> Your meetings
                </CardTitle>
                <Badge tone="neutral">{meetings.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {meetings.length === 0 && (
                  <p className="text-sm text-muted-foreground">No meetings booked.</p>
                )}
                {meetings.map((meeting) => {
                  const others = meeting.participants
                    .map((p) => p.participant.name)
                    .filter((n) => !me || n !== me.name);
                  const status = MEETING_STATUS[meeting.status];
                  return (
                    <div key={meeting.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">
                          {others.length > 0 ? others.join(", ") : "Meeting"}
                        </p>
                        <Badge tone={status?.tone ?? "neutral"}>
                          {status?.label ?? meeting.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {meeting.slot ? formatTime(meeting.slot.startsAt) : "TBD"}
                        </span>
                        {meeting.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {meeting.location.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Your agenda */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" /> Your agenda
                </CardTitle>
                <Badge tone="neutral">{sessions.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No sessions yet.</p>
                )}
                {sessions.map((session, i) => (
                  <div key={session.id}>
                    {i > 0 && <Separator className="my-2" />}
                    <div className="flex items-start gap-3">
                      <span className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
                        {formatTime(session.startsAt)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{session.title}</p>
                        {session.speaker && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {session.speaker.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" /> Messages
                </CardTitle>
                <Badge tone="neutral">{conversations.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                )}
                {conversations.map((c) => {
                  const others = c.members
                    .map((mem) => mem.participant.name)
                    .filter((n) => !me || n !== me.name);
                  const title = c.title ?? (others.join(", ") || "Conversation");
                  const last = c.messages[0];
                  return (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3"
                    >
                      <Avatar name={title} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{title}</p>
                        {last ? (
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {last.senderName}:
                            </span>{" "}
                            {last.body}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            No messages yet.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LogoMark className="size-6" /> Powered by{" "}
            <span className="font-semibold text-foreground">MeetLynq</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Meet smarter. Connect faster. Measure what matters.
          </p>
        </div>
      </footer>
    </div>
  );
}
