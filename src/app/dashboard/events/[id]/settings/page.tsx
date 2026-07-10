import { Rocket, Settings, TriangleAlert } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { EVENT_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EventSettingsForm } from "./settings-form";
import { updateEventDetails, setEventStatus, deleteEvent } from "./actions";

const STATUSES = ["DRAFT", "PUBLISHED", "LIVE", "ENDED", "ARCHIVED"] as const;

function toLocal(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 16) : "";
}

export default async function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);
  const current = EVENT_STATUS[event.status];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Event settings</h2>
        <p className="text-sm text-muted-foreground">Manage details, publishing status, and lifecycle.</p>
      </div>

      {/* Status / publishing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" /> Status &amp; publishing
          </CardTitle>
          <CardDescription>
            Currently <Badge tone={current.tone}>{current.label}</Badge>. Published events are visible on the public page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const meta = EVENT_STATUS[s];
              const isCurrent = s === event.status;
              return (
                <form key={s} action={setEventStatus}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      isCurrent
                        ? "cursor-default border-primary bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    )}
                  >
                    {meta.label}
                  </button>
                </form>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Draft hides the event from the public page. Publish to open registration; Ended/Archived close it out.
          </p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-4 text-primary" /> Event details
          </CardTitle>
          <CardDescription>These appear across the dashboard and on the public event page.</CardDescription>
        </CardHeader>
        <CardContent>
          <EventSettingsForm
            action={updateEventDetails}
            event={{
              id: event.id,
              name: event.name,
              tagline: event.tagline ?? "",
              description: event.description ?? "",
              type: event.type,
              format: event.format,
              startsAtLocal: toLocal(event.startsAt),
              endsAtLocal: toLocal(event.endsAt),
              timezone: event.timezone,
              venueName: event.venueName ?? "",
              venueAddress: event.venueAddress ?? "",
              city: event.city ?? "",
              country: event.country ?? "",
              capacity: event.capacity != null ? String(event.capacity) : "",
              brandColor: event.brandColor,
              seoTitle: event.seoTitle ?? "",
              seoDescription: event.seoDescription ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            Deleting an event permanently removes its registrations, tickets, sessions, and all related data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Prefer to keep the data? Set the status to <strong>Archived</strong> instead.
          </p>
          <div className="rounded-lg border border-destructive/40 p-1">
            <DeleteButton
              action={deleteEvent}
              id={event.id}
              eventId={event.id}
              label="Delete this event"
              confirmText={`Permanently delete "${event.name}" and ALL its data? This cannot be undone.`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
