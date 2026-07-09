import { CalendarClock, Layers, Boxes, Search } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { createSession, updateSession, deleteSession } from "../manage-actions";

const SESSION_FORMATS = ["TALK", "PANEL", "WORKSHOP", "BREAKOUT", "KEYNOTE"];

export default async function AgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const [sessions, tracks, speakers] = await Promise.all([
    db.session.findMany({
      where: { eventId: id },
      include: { track: true, speaker: true },
      orderBy: { startsAt: "asc" },
    }),
    db.sessionTrack.findMany({ where: { eventId: id } }),
    db.speaker.findMany({ where: { eventId: id }, orderBy: { name: "asc" } }),
  ]);

  const breakouts = sessions.filter((s) => s.format === "BREAKOUT" || s.isBreakout).length;

  const sessionFields = (s?: (typeof sessions)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Title">
        <Input name="title" placeholder="Opening keynote" defaultValue={s?.title ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Track">
          <Select name="trackId" defaultValue={s?.trackId ?? ""}>
            <option value="">No track</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Speaker">
          <Select name="speakerId" defaultValue={s?.speakerId ?? ""}>
            <option value="">No speaker</option>
            {speakers.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Room">
          <Input name="room" placeholder="Main Hall" defaultValue={s?.room ?? ""} />
        </Field>
        <Field label="Format">
          <Select name="format" defaultValue={s?.format ?? "TALK"}>
            {SESSION_FORMATS.map((f) => (
              <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Capacity">
        <Input name="capacity" type="number" min="0" placeholder="200" defaultValue={s?.capacity != null ? String(s.capacity) : ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts at">
          <Input name="startsAt" type="datetime-local" defaultValue={s?.startsAt ? new Date(s.startsAt).toISOString().slice(0, 16) : ""} />
        </Field>
        <Field label="Ends at">
          <Input name="endsAt" type="datetime-local" defaultValue={s?.endsAt ? new Date(s.endsAt).toISOString().slice(0, 16) : ""} />
        </Field>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agenda</h2>
          <p className="text-sm text-muted-foreground">Build your schedule and manage every session.</p>
        </div>
        <FormDialog
          buttonLabel="Add session"
          title="Add session"
          description="Add a talk, panel, workshop, or breakout to your agenda."
          action={createSession}
          submitLabel="Add session"
        >
          {sessionFields()}
        </FormDialog>
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
            <FormDialog
              buttonLabel="Add session"
              title="Add session"
              description="Add a talk, panel, workshop, or breakout to your agenda."
              action={createSession}
              submitLabel="Add session"
            >
              {sessionFields()}
            </FormDialog>
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
                  <TH className="text-right">Actions</TH>
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
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <FormDialog
                          mode="edit"
                          buttonLabel={`Edit ${s.title}`}
                          title="Edit session"
                          description="Update this session."
                          action={updateSession}
                          submitLabel="Save changes"
                        >
                          {sessionFields(s)}
                        </FormDialog>
                        <DeleteButton
                          action={deleteSession}
                          id={s.id}
                          eventId={id}
                          confirmText={`Delete "${s.title}"? This can't be undone.`}
                        />
                      </div>
                    </TD>
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
