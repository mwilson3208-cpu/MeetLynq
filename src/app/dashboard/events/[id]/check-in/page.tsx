import { UserCheck, Users, WifiOff, Gauge, QrCode, Undo2 } from "lucide-react";
import { getEventOr404, getEventStats } from "@/lib/queries";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/misc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, pct } from "@/lib/utils";
import { CheckInPanel } from "@/components/checkin/check-in-panel";
import { checkInByLookup, undoCheckIn } from "./actions";

const METHOD_TONE: Record<string, "primary" | "neutral" | "info"> = {
  QR: "primary",
  MANUAL: "neutral",
  KIOSK: "info",
};

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getEventOr404(id);
  const stats = await getEventStats(id);

  const recent = await db.checkIn.findMany({
    where: { eventId: id },
    include: { registration: true },
    orderBy: { checkedInAt: "desc" },
    take: 15,
  });

  const rate = pct(stats.checkedIn, stats.registrations);
  const remaining = Math.max(0, stats.registrations - stats.checkedIn);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Check-in</h2>
          <p className="text-sm text-muted-foreground">
            Scan badges or check attendees in manually at the door.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            <WifiOff className="size-3" /> Offline mode
          </Badge>
          <Badge tone="info">
            <Gauge className="size-3" /> Low-bandwidth mode
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Check-in rate"
          value={`${rate}%`}
          icon={<Gauge />}
          tone="success"
          hint={`${stats.checkedIn} of ${stats.registrations}`}
        />
        <StatCard label="Checked in" value={stats.checkedIn} icon={<UserCheck />} tone="info" />
        <StatCard label="Remaining" value={remaining} icon={<Users />} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check attendees in</CardTitle>
            <CardDescription>Scan a QR badge into the field, or search by name or email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto flex aspect-square w-full max-w-[11rem] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-secondary/30 text-center">
              <QrCode className="size-14 text-muted-foreground" />
              <p className="mt-2 px-4 text-xs text-muted-foreground">
                A QR scanner types the code into the field below.
              </p>
            </div>
            <CheckInPanel action={checkInByLookup} eventId={id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Latest {recent.length} arrivals.</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No check-ins yet. They&apos;ll appear here in real time.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.registration.firstName} {c.registration.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.staffName ? `by ${c.staffName} · ` : ""}
                        {formatDateTime(c.checkedInAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={METHOD_TONE[c.method] ?? "neutral"}>{c.method}</Badge>
                      <form action={undoCheckIn}>
                        <input type="hidden" name="eventId" value={id} />
                        <input type="hidden" name="id" value={c.registrationId} />
                        <button
                          type="submit"
                          aria-label="Undo check-in"
                          title="Undo check-in"
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&_svg]:size-4"
                        >
                          <Undo2 />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
