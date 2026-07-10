import { notFound } from "next/navigation";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { ButtonLink } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { BadgeCard } from "../badge-card";

export const dynamic = "force-dynamic";

export default async function BadgePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ badge?: string }>;
}) {
  const { id } = await params;
  const { badge } = await searchParams;
  const event = await getEventOr404(id);

  const badges = await db.badge.findMany({
    where: { eventId: id, ...(badge ? { id: badge } : {}) },
    include: { registration: true },
    orderBy: { createdAt: "desc" },
  });
  if (badges.length === 0) notFound();

  const qrs = await Promise.all(badges.map((b) => qrSvg(b.qrToken)));

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Controls — hidden when printing */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">
            {badge ? "Print badge" : "Print all badges"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {badges.length} badge{badges.length === 1 ? "" : "s"} · use your browser&apos;s “Save as
            PDF” to export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/dashboard/events/${id}/badges`} variant="ghost" size="sm">
            Back
          </ButtonLink>
          <PrintButton label="Print / Save PDF" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-2">
        {badges.map((b, i) => (
          <BadgeCard
            key={b.id}
            eventName={event.name}
            name={`${b.registration.firstName} ${b.registration.lastName}`}
            title={b.title}
            company={b.company}
            qr={qrs[i]}
            token={b.qrToken}
          />
        ))}
      </div>
    </div>
  );
}
