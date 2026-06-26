import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { EventNav } from "@/components/layout/event-nav";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EVENT_STATUS, EVENT_TYPES, labelOf } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventOr404(id);
  const status = EVENT_STATUS[event.status];

  return (
    <div>
      <Link href="/dashboard/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All events
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {labelOf(EVENT_TYPES, event.type)} · {formatDate(event.startsAt)} · {event.city ?? "Location TBD"}
          </p>
        </div>
        <ButtonLink href={`/e/${event.slug}`} target="_blank" variant="outline" size="sm">
          View public page <ExternalLink className="size-4" />
        </ButtonLink>
      </div>
      <EventNav eventId={event.id} />
      {children}
    </div>
  );
}
