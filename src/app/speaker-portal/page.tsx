import { Mic, FileText, MessageSquare, Calendar } from "lucide-react";
import { db } from "@/lib/db";
import { PortalShell } from "@/components/layout/portal-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { formatTime, parseJson } from "@/lib/utils";

export const metadata = { title: "Speaker portal" };

export default async function SpeakerPortal() {
  const event =
    (await db.event.findFirst({ where: { slug: "growthscale-summit-2026" } })) ??
    (await db.event.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!event) {
    return <EmptyState icon={<Mic />} title="No event found" description="Seed the demo data to preview the speaker portal." />;
  }
  const speaker = await db.speaker.findFirst({
    where: { eventId: event.id },
    include: { sessions: { include: { track: true }, orderBy: { startsAt: "asc" } } },
  });
  if (!speaker) {
    return <EmptyState icon={<Mic />} title="No speaker profile" description="No speaker has been added to this event yet." />;
  }
  const resources = parseJson<string[]>(speaker.resources, []);

  return (
    <PortalShell role="Speaker" eventName={event.name} userName={speaker.name}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {speaker.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your sessions, bio, resources, and audience Q&amp;A for {event.name}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" /> Your sessions
              </CardTitle>
              <CardDescription>Sessions assigned to you at this event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {speaker.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions assigned yet.</p>
              ) : (
                speaker.sessions.map((s) => (
                  <div key={s.id} className="flex items-start justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatTime(s.startsAt)} – {formatTime(s.endsAt)} · {s.room ?? "Room TBD"}
                      </p>
                    </div>
                    {s.track && (
                      <Badge tone="primary" style={{ background: `${s.track.color}1a`, color: s.track.color }}>
                        {s.track.name}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Your bio &amp; session details
              </CardTitle>
              <CardDescription>Edits are reviewed by the organizer before publishing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Title">
                <Input defaultValue={speaker.title ?? ""} />
              </Field>
              <Field label="Bio">
                <Textarea defaultValue={speaker.bio ?? ""} rows={4} />
              </Field>
              <Field label="Session description">
                <Textarea defaultValue={speaker.sessionDescription ?? ""} rows={3} />
              </Field>
              <div className="flex justify-end">
                <Button>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" /> Audience Q&amp;A
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>Q&amp;A moderation</span>
                <Badge tone={speaker.qaModeration ? "success" : "neutral"}>
                  {speaker.qaModeration ? "On" : "Off"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Questions from attendees appear here during your session. You can approve, answer, or hide them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Slides, links, and files for attendees.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resources uploaded yet.</p>
              ) : (
                resources.map((r) => (
                  <div key={r} className="rounded-lg border p-2 text-sm">{r}</div>
                ))
              )}
              <Button variant="outline" className="w-full">Upload resource</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
