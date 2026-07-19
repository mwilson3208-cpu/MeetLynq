import {
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  UserX,
  Clock,
  MapPin,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { formatTime, pct } from "@/lib/utils";
import { MEETING_STATUS } from "@/lib/constants";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field, Select } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  createMeetingSlot,
  updateMeetingSlot,
  deleteMeetingSlot,
  createMeetingLocation,
  updateMeetingLocation,
  deleteMeetingLocation,
} from "../manage-actions";
import { setMeetingStatus, scheduleMeeting, deleteMeeting } from "./meeting-actions";

const STATUS_FILTERS = ["All", "Requested", "Approved", "Completed", "No-show", "Canceled"];

/** One-click meeting status transition. */
function MeetingStatusButton({
  eventId,
  id,
  status,
  variant,
  children,
}: {
  eventId: string;
  id: string;
  status: string;
  variant: "success" | "outline" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <form action={setMeetingStatus}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>
        {children}
      </Button>
    </form>
  );
}

/** Contextual actions for a meeting based on its current status. */
function MeetingActions({ eventId, id, status }: { eventId: string; id: string; status: string }) {
  const pending = status === "REQUESTED" || status === "RESCHEDULE";
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {pending && (
        <>
          <MeetingStatusButton eventId={eventId} id={id} status="APPROVED" variant="success">
            <Check className="size-4" /> Approve
          </MeetingStatusButton>
          <MeetingStatusButton eventId={eventId} id={id} status="DECLINED" variant="ghost">
            <X className="size-4" /> Decline
          </MeetingStatusButton>
        </>
      )}
      {status === "APPROVED" && (
        <>
          <MeetingStatusButton eventId={eventId} id={id} status="COMPLETED" variant="success">
            <Check className="size-4" /> Complete
          </MeetingStatusButton>
          <MeetingStatusButton eventId={eventId} id={id} status="NO_SHOW" variant="outline">
            No-show
          </MeetingStatusButton>
          <MeetingStatusButton eventId={eventId} id={id} status="CANCELED" variant="ghost">
            Cancel
          </MeetingStatusButton>
        </>
      )}
      <form action={deleteMeeting}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          aria-label="Delete meeting"
          title="Delete meeting"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4"
        >
          <Trash2 />
        </button>
      </form>
    </div>
  );
}

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getEventOr404(id);

  const meetings = await db.meeting.findMany({
    where: { eventId: id },
    include: {
      slot: true,
      location: true,
      participants: { include: { participant: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const slots = await db.meetingSlot.findMany({
    where: { eventId: id },
    orderBy: { startsAt: "asc" },
  });

  const locations = await db.meetingLocation.findMany({
    where: { eventId: id },
  });

  const participants = await db.participant.findMany({
    where: { eventId: id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, companyName: true },
  });

  const participantOptions = (name: string) => (
    <Select name={name} defaultValue="" required>
      <option value="" disabled>
        Choose a participant
      </option>
      {participants.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.companyName ? ` · ${p.companyName}` : ""}
        </option>
      ))}
    </Select>
  );

  const scheduleDialog = (
    <FormDialog
      buttonLabel="Schedule meeting"
      title="Schedule a meeting"
      description="Book a 1:1 between two participants."
      action={scheduleMeeting}
      submitLabel="Schedule meeting"
      buttonSize="sm"
    >
      <input type="hidden" name="eventId" value={id} />
      <Field label="Participant A">{participantOptions("participantAId")}</Field>
      <Field label="Participant B">{participantOptions("participantBId")}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slot">
          <Select name="slotId" defaultValue="">
            <option value="">Unscheduled</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label ?? "Slot"} · {formatTime(s.startsAt)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Select name="locationId" defaultValue="">
            <option value="">No location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mode">
          <Select name="mode" defaultValue="IN_PERSON">
            <option value="IN_PERSON">In-person</option>
            <option value="ONLINE">Online</option>
          </Select>
        </Field>
        <Field label="Goal">
          <Input name="goal" placeholder="Explore partnership" />
        </Field>
      </div>
    </FormDialog>
  );

  const total = meetings.length;
  const approved = meetings.filter((m) => m.status === "APPROVED").length;
  const completed = meetings.filter((m) => m.status === "COMPLETED").length;
  const noShows = meetings.filter((m) => m.noShow).length;
  const noShowRate = pct(noShows, total);

  const slotFields = (s?: (typeof slots)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Label">
        <Input name="label" placeholder="Slot 1" defaultValue={s?.label ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts">
          <Input
            name="startsAt"
            type="datetime-local"
            defaultValue={s?.startsAt ? new Date(s.startsAt).toISOString().slice(0, 16) : ""}
            required
          />
        </Field>
        <Field label="Ends">
          <Input
            name="endsAt"
            type="datetime-local"
            defaultValue={s?.endsAt ? new Date(s.endsAt).toISOString().slice(0, 16) : ""}
            required
          />
        </Field>
      </div>
    </>
  );

  const newSlotDialog = (
    <FormDialog
      buttonLabel="Add slot"
      title="Add meeting slot"
      description="A window when 1:1 meetings can be booked."
      action={createMeetingSlot}
      submitLabel="Add slot"
      buttonSize="sm"
    >
      {slotFields()}
    </FormDialog>
  );

  const locationFields = (l?: (typeof locations)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {l && <input type="hidden" name="id" value={l.id} />}
      <Field label="Name">
        <Input name="name" placeholder="Table 1" defaultValue={l?.name ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kind">
          <Select name="kind" defaultValue={l?.kind ?? "TABLE"}>
            <option value="TABLE">Table</option>
            <option value="ROOM">Room</option>
            <option value="AREA">Area</option>
            <option value="VIRTUAL">Virtual</option>
          </Select>
        </Field>
        <Field label="Capacity">
          <Input name="capacity" type="number" min="1" defaultValue={l?.capacity != null ? String(l.capacity) : "2"} />
        </Field>
      </div>
    </>
  );

  const newLocationDialog = (
    <FormDialog
      buttonLabel="Add location"
      title="Add location / table"
      description="Where meetings physically happen."
      action={createMeetingLocation}
      submitLabel="Add location"
      buttonSize="sm"
    >
      {locationFields()}
    </FormDialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meeting scheduler</h2>
          <p className="text-sm text-muted-foreground">
            Book and track 1:1 and group meetings across slots and locations.
          </p>
        </div>
        {scheduleDialog}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total meetings" value={total} icon={<CalendarClock />} />
        <StatCard label="Approved" value={approved} icon={<CalendarCheck />} tone="success" />
        <StatCard label="Completed" value={completed} icon={<CheckCircle2 />} tone="info" />
        <StatCard
          label="No-show rate"
          value={`${noShowRate}%`}
          icon={<UserX />}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f, i) => (
          <button
            key={f}
            className={
              i === 0
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Meetings</CardTitle>
            <CardDescription>All scheduled and requested meetings.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {total === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<CalendarClock />}
                  title="No meetings yet"
                  description="Schedule your first meeting to start building the agenda."
                  action={scheduleDialog}
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Participants</TH>
                    <TH>Time</TH>
                    <TH>Location</TH>
                    <TH>Type</TH>
                    <TH>Mode</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {meetings.map((m) => {
                    const names = m.participants
                      .map((p) => p.participant.name)
                      .join(" ↔ ");
                    const meta =
                      MEETING_STATUS[m.status] ?? { label: m.status, tone: "neutral" as const };
                    return (
                      <TR key={m.id}>
                        <TD className="font-medium">{names || "—"}</TD>
                        <TD>{m.slot ? formatTime(m.slot.startsAt) : "Unscheduled"}</TD>
                        <TD>{m.location?.name ?? "—"}</TD>
                        <TD>{m.type}</TD>
                        <TD>
                          <Badge tone={m.mode === "ONLINE" ? "info" : "neutral"}>
                            {m.mode === "ONLINE" ? "Online" : "In-person"}
                          </Badge>
                        </TD>
                        <TD>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </TD>
                        <TD>
                          <MeetingActions eventId={id} id={m.id} status={m.status} />
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Meeting slots
              </CardTitle>
              {newSlotDialog}
            </CardHeader>
            <CardContent className="space-y-2">
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots configured.</p>
              ) : (
                slots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span className="font-medium">{s.label ?? "Slot"}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">
                        {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                      </span>
                      <FormDialog
                        mode="edit"
                        buttonLabel={`Edit ${s.label ?? "slot"}`}
                        title="Edit meeting slot"
                        action={updateMeetingSlot}
                        submitLabel="Save changes"
                      >
                        {slotFields(s)}
                      </FormDialog>
                      <DeleteButton action={deleteMeetingSlot} id={s.id} eventId={id} confirmText="Delete this slot?" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Locations / tables
              </CardTitle>
              {newLocationDialog}
            </CardHeader>
            <CardContent className="space-y-2">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No locations configured.</p>
              ) : (
                locations.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.kind}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone="neutral">Seats {l.capacity}</Badge>
                      <FormDialog
                        mode="edit"
                        buttonLabel={`Edit ${l.name}`}
                        title="Edit location / table"
                        action={updateMeetingLocation}
                        submitLabel="Save changes"
                      >
                        {locationFields(l)}
                      </FormDialog>
                      <DeleteButton action={deleteMeetingLocation} id={l.id} eventId={id} confirmText="Delete this location?" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
