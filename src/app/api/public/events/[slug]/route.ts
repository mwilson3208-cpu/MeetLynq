import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public read API for an event — powers the PWA, embeds, and integrations.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    return await handleGet(params);
  } catch (err) {
    console.error("[public-event-api]", err);
    return NextResponse.json(
      { error: "The event couldn't be loaded right now. Please try again shortly." },
      { status: 500 }
    );
  }
}

async function handleGet(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      type: true,
      format: true,
      status: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      venueName: true,
      city: true,
      country: true,
      brandColor: true,
      speakers: { select: { name: true, title: true, companyName: true, sessionTitle: true } },
      tickets: { where: { isActive: true }, select: { name: true, type: true, priceCents: true, currency: true } },
      sessions: {
        orderBy: { startsAt: "asc" },
        select: { title: true, startsAt: true, endsAt: true, room: true },
      },
    },
  });

  if (!event || event.status === "DRAFT") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event });
}
