import { IdCard, QrCode, Download, Printer } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export default async function BadgesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const badges = await db.badge.findMany({
    where: { eventId: id },
    include: { registration: true },
    take: 24,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Badges</h2>
          <p className="text-sm text-muted-foreground">
            Printable name badges with scannable QR codes.
          </p>
        </div>
        <Button variant="primary" disabled={badges.length === 0}>
          <Download /> Download all (PDF)
        </Button>
      </div>

      <div className="grid gap-4 sm:max-w-xs">
        <StatCard label="Badges generated" value={badges.length} icon={<IdCard />} />
      </div>

      {badges.length === 0 ? (
        <EmptyState
          icon={<IdCard />}
          title="No badges yet"
          description="Badges are generated when attendees check in or register."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {badges.map((b) => {
            const name = `${b.registration.firstName} ${b.registration.lastName}`;
            return (
              <div
                key={b.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <div className="border-b bg-secondary/40 px-4 py-2">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {event.name}
                  </p>
                </div>
                <div className="flex flex-1 flex-col items-center gap-3 p-5 text-center">
                  <div className="flex size-24 items-center justify-center rounded-lg border bg-white">
                    <QrCode className="size-16 text-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold leading-tight">{name}</p>
                    {b.title && (
                      <p className="text-sm text-muted-foreground">{b.title}</p>
                    )}
                    {b.company && (
                      <p className="text-sm font-medium text-foreground">{b.company}</p>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {b.qrToken.slice(0, 12)}…
                  </p>
                </div>
                <div className="border-t p-3">
                  <Button variant="outline" size="sm" className="w-full">
                    <Printer /> Print
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
