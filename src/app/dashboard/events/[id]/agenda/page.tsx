import { Plus, CalendarClock, Layers, Boxes, Search } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard, EmptyState } from "@/components/ui/misc";

export default async function AgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const [sessions, tracks] = await Promise.all([
    db.session.findMany({
      where: { eventId: id },
      include: { track: true, speaker: true },
      orderBy: { startsAt: "asc" },
    }),
    db.sessionTrack.findMany({ where: { eventId: id } }),
  ]);

  const breakouts = sessions.filter((s) => s.format === "BREAKOUT" || s.isBreakout).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agenda</h2>
          <p className="text-sm text-muted-foreground">Build your schedule and manage every session.</p>
        </div>
        <Button>
          <Plus className="size-4" /> Add session
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sessions" value={sessions.length} icon={<CalendarClock />} />
        <StatCard label="Tracks" value={tracks.length} icon={<Layers />} tone="info" />
        <StatCard label="Breakouts" value={breakouts} icon={<Boxes />} tone="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">All tracks</Badge>
        {tracks.map((track) => (
          <span
            key={track.id}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs font-medium"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: track.color }} />
            {track.name}
          </span>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sessions" className="pl-9" />
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="No sessions scheduled"
          description="Add talks, panels, workshops, and breakouts to build out your agenda."
          action={
            <Button>
              <Plus className="size-4" /> Add session
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Session</TH>
                  <TH>Track</TH>
                  <TH>Speaker</TH>
                  <TH>Room</TH>
                  <TH>Format</TH>
                  <TH>Capacity</TH>
                </TR>
              </THead>
              <TBody>
                {sessions.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                    </TD>
                    <TD className="font-medium">{s.title}</TD>
                    <TD>
                      {s.track ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${s.track.color}1a`, color: s.track.color }}
                        >
                          <span className="size-2 rounded-full" style={{ backgroundColor: s.track.color }} />
                          {s.track.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>{s.speaker?.name ?? <span className="text-muted-foreground">—</span>}</TD>
                    <TD>{s.room ?? <span className="text-muted-foreground">—</span>}</TD>
                    <TD>
                      <Badge tone="neutral" className="capitalize">
                        {s.format.toLowerCase()}
                      </Badge>
                    </TD>
                    <TD>{s.capacity ?? <span className="text-muted-foreground">—</span>}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
