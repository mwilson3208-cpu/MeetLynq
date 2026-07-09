import { Users, UserPlus, Search, Check, Clock, X, RotateCcw } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { ExportButton } from "@/components/ui/export-button";
import { db } from "@/lib/db";
import { StatCard, Avatar, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { REGISTRATION_STATUS } from "@/lib/constants";
import { setRegistrationStatus } from "./actions";

const STAT_ORDER = ["CONFIRMED", "PENDING", "CHECKED_IN", "WAITLISTED", "CANCELED"] as const;

/** One-click registration status transition. */
function StatusForm({
  eventId,
  id,
  status,
  variant,
  children,
}: {
  eventId: string;
  id: string;
  status: string;
  variant: ButtonProps["variant"];
  children: React.ReactNode;
}) {
  return (
    <form action={setRegistrationStatus}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>
        {children}
      </Button>
    </form>
  );
}

/** Contextual approval actions based on the registration's current status. */
function RegistrationActions({ eventId, id, status }: { eventId: string; id: string; status: string }) {
  if (status === "PENDING") {
    return (
      <>
        <StatusForm eventId={eventId} id={id} status="CONFIRMED" variant="success">
          <Check className="size-4" /> Approve
        </StatusForm>
        <StatusForm eventId={eventId} id={id} status="WAITLISTED" variant="outline">
          <Clock className="size-4" /> Waitlist
        </StatusForm>
        <StatusForm eventId={eventId} id={id} status="CANCELED" variant="ghost">
          <X className="size-4" /> Decline
        </StatusForm>
      </>
    );
  }
  if (status === "WAITLISTED") {
    return (
      <>
        <StatusForm eventId={eventId} id={id} status="CONFIRMED" variant="success">
          <Check className="size-4" /> Approve
        </StatusForm>
        <StatusForm eventId={eventId} id={id} status="CANCELED" variant="ghost">
          <X className="size-4" /> Decline
        </StatusForm>
      </>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <StatusForm eventId={eventId} id={id} status="CANCELED" variant="ghost">
        <X className="size-4" /> Cancel
      </StatusForm>
    );
  }
  if (status === "CANCELED") {
    return (
      <StatusForm eventId={eventId} id={id} status="CONFIRMED" variant="outline">
        <RotateCcw className="size-4" /> Restore
      </StatusForm>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getEventOr404(id);

  const [registrations, grouped] = await Promise.all([
    db.registration.findMany({
      where: { eventId: id },
      include: { ticket: true },
      orderBy: { createdAt: "desc" },
    }),
    db.registration.groupBy({
      by: ["status"],
      where: { eventId: id },
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendees</h2>
          <p className="text-sm text-muted-foreground">
            {registrations.length} registration{registrations.length === 1 ? "" : "s"} for this
            event.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton eventId={id} type="attendees" label="Export" />
          <Button variant="primary">
            <UserPlus /> Add attendee
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_ORDER.map((s) => {
          const meta = REGISTRATION_STATUS[s];
          return (
            <StatCard
              key={s}
              label={meta.label}
              value={counts[s] ?? 0}
              tone={
                s === "CHECKED_IN"
                  ? "success"
                  : s === "PENDING" || s === "WAITLISTED"
                    ? "warning"
                    : "info"
              }
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">All</Badge>
          {STAT_ORDER.map((s) => (
            <Badge key={s} tone="neutral">
              {REGISTRATION_STATUS[s].label}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {registrations.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Users />}
                title="No attendees yet"
                description="Registrations will appear here as people sign up, or add one manually."
                action={
                  <Button variant="primary">
                    <UserPlus /> Add attendee
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Ticket</TH>
                  <TH>Status</TH>
                  <TH>Registered</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {registrations.map((r) => {
                  const name = `${r.firstName} ${r.lastName}`;
                  const meta = REGISTRATION_STATUS[r.status] ?? {
                    label: r.status,
                    tone: "neutral" as const,
                  };
                  return (
                    <TR key={r.id}>
                      <TD>
                        <span className="flex items-center gap-3">
                          <Avatar name={name} size={32} />
                          <span className="font-medium">{name}</span>
                        </span>
                      </TD>
                      <TD className="text-muted-foreground">{r.email}</TD>
                      <TD>{r.ticket?.name ?? "—"}</TD>
                      <TD>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </TD>
                      <TD className="text-muted-foreground">{formatDate(r.createdAt)}</TD>
                      <TD>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <RegistrationActions eventId={id} id={r.id} status={r.status} />
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
