import { IdCard, Wand2, Download } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { BadgeCard } from "./badge-card";
import { generateBadges } from "./actions";

export default async function BadgesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const [badges, pending] = await Promise.all([
    db.badge.findMany({
      where: { eventId: id },
      include: { registration: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.registration.count({ where: { eventId: id, status: { not: "CANCELED" }, badge: { is: null } } }),
  ]);

  const qrs = await Promise.all(badges.map((b) => qrSvg(b.qrToken)));

  const generateForm = (
    <form action={generateBadges}>
      <input type="hidden" name="eventId" value={id} />
      <Button type="submit" variant="primary">
        <Wand2 /> Generate badges{pending > 0 ? ` (${pending})` : ""}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Badges</h2>
          <p className="text-sm text-muted-foreground">
            Printable name badges with scannable QR codes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && generateForm}
          {badges.length > 0 && (
            <ButtonLink href={`/dashboard/events/${id}/badges/print`} variant="outline">
              <Download className="size-4" /> Download all (PDF)
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
        <StatCard label="Badges generated" value={badges.length} icon={<IdCard />} />
        <StatCard
          label="Awaiting a badge"
          value={pending}
          icon={<Wand2 />}
          tone={pending > 0 ? "warning" : "success"}
        />
      </div>

      {badges.length === 0 ? (
        <EmptyState
          icon={<IdCard />}
          title="No badges yet"
          description="Badges are created automatically at check-in — or generate them now for everyone who's registered."
          action={pending > 0 ? generateForm : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {badges.map((b, i) => (
            <div key={b.id} className="flex flex-col gap-2">
              <BadgeCard
                eventName={event.name}
                name={`${b.registration.firstName} ${b.registration.lastName}`}
                title={b.title}
                company={b.company}
                qr={qrs[i]}
                token={b.qrToken}
              />
              <ButtonLink
                href={`/dashboard/events/${id}/badges/print?badge=${b.id}`}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Print
              </ButtonLink>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
