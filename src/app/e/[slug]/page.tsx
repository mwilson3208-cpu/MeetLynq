import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Presentation,
  Sparkles,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { cn, formatMoney, formatDate, formatTime } from "@/lib/utils";
import {
  labelOf,
  EVENT_TYPES,
  EVENT_FORMATS,
  TICKET_TYPES,
  SPONSOR_LEVELS,
} from "@/lib/constants";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";

async function loadEvent(slug: string) {
  return db.event.findUnique({
    where: { slug },
    include: {
      speakers: { take: 8, orderBy: { featured: "desc" } },
      sponsors: { orderBy: { level: "asc" } },
      sessions: {
        include: { track: true, speaker: true },
        orderBy: { startsAt: "asc" },
        take: 8,
      },
      tickets: { where: { isActive: true }, orderBy: { priceCents: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await db.event.findUnique({ where: { slug } });
  if (!event) return { title: "Event not found · MeetLynq" };
  return {
    title: event.seoTitle ?? event.name,
    description: event.seoDescription ?? event.tagline ?? "",
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const brand = event.brandColor || "#4f46e5";
  const hasSpeakers = event.speakers.length > 0;
  const hasSessions = event.sessions.length > 0;
  const hasSponsors = event.sponsors.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-7 shrink-0" />
            <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
              {event.name}
            </span>
          </div>
          <ButtonLink href="#register" size="sm">
            Register <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </header>

      <main className="flex-1">
        {/* Cover image */}
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt={`${event.name} cover`}
            className="h-48 w-full border-b object-cover sm:h-64 lg:h-80"
          />
        )}
        {/* Hero */}
        <section
          className="relative overflow-hidden border-b"
          style={{
            backgroundImage: `linear-gradient(135deg, ${brand}1f, ${brand}0a 55%, transparent)`,
          }}
        >
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="container relative py-20 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge tone="primary" className="mb-5">
                <Sparkles className="size-3" /> {labelOf(EVENT_TYPES, event.type)}
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {event.name}
              </h1>
              {event.tagline && (
                <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                  {event.tagline}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {formatDate(event.startsAt, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {(event.venueName || event.city) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {[event.venueName, event.city].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Presentation className="size-4" />
                  {labelOf(EVENT_FORMATS, event.format)}
                </span>
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="#register" size="lg">
                  Register now <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href="#agenda" size="lg" variant="outline">
                  View agenda
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        {event.description && (
          <section className="container py-16 lg:py-24">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                About this event
              </h2>
              <div className="mt-5 space-y-4 text-pretty text-lg leading-relaxed text-muted-foreground">
                {event.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Speakers */}
        {hasSpeakers && (
          <section id="speakers" className="border-y bg-secondary/40">
            <div className="container py-16 lg:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Speakers
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Learn from the people shaping the conversation.
                </p>
              </div>
              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {event.speakers.map((s) => (
                  <Card key={s.id} className="text-center">
                    <CardContent className="flex flex-col items-center p-6">
                      <Avatar name={s.name} src={s.photoUrl} size={80} />
                      <h3 className="mt-4 font-semibold">{s.name}</h3>
                      {(s.title || s.companyName) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[s.title, s.companyName].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {s.sessionTitle && (
                        <p className="mt-3 text-xs font-medium text-primary">
                          {s.sessionTitle}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Agenda */}
        {hasSessions && (
          <section id="agenda" className="container py-16 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Agenda
              </h2>
              <p className="mt-3 text-muted-foreground">
                A full program of talks, panels, and workshops.
              </p>
            </div>
            <div className="mx-auto mt-12 max-w-3xl space-y-3">
              {event.sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground sm:w-40">
                      <Clock className="size-4" />
                      {formatTime(session.startsAt)}
                      {session.endsAt ? ` – ${formatTime(session.endsAt)}` : ""}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{session.title}</h3>
                        {session.track && (
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${session.track.color}1f`,
                              color: session.track.color,
                            }}
                          >
                            {session.track.name}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          session.speaker?.name,
                          session.room,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Sponsors */}
        {hasSponsors && (
          <section className="border-y bg-secondary/40">
            <div className="container py-16 lg:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Sponsors & partners
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Made possible by the organizations backing this event.
                </p>
              </div>
              <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {event.sponsors.map((sponsor) => {
                  const level = SPONSOR_LEVELS[sponsor.level];
                  return (
                    <Card key={sponsor.id}>
                      <CardContent className="flex items-center gap-4 p-5">
                        <Avatar name={sponsor.name} src={sponsor.logoUrl} size={48} />
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{sponsor.name}</h3>
                          <Badge tone={level?.tone ?? "neutral"} className="mt-1">
                            {level?.label ?? sponsor.level}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Registration */}
        <section id="register" className="container py-16 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Register
            </h2>
            <p className="mt-3 text-muted-foreground">
              Secure your spot in a few seconds. No app download required.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
            {/* Ticket options */}
            <div className="space-y-4">
              {event.tickets.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Tickets are not yet available for this event.
                  </CardContent>
                </Card>
              )}
              {event.tickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{ticket.name}</h3>
                        <Badge tone="primary">
                          {labelOf(TICKET_TYPES, ticket.type)}
                        </Badge>
                      </div>
                      {ticket.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ticket.description}
                        </p>
                      )}
                      <p className="mt-3 text-2xl font-bold tracking-tight">
                        {ticket.priceCents > 0
                          ? formatMoney(ticket.priceCents, ticket.currency)
                          : "Free"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      Select
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Registration form */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Complete your registration</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ll send your ticket and event details by email.
                </p>
                <form className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name">
                      <Input placeholder="Jordan" name="firstName" />
                    </Field>
                    <Field label="Last name">
                      <Input placeholder="Rivera" name="lastName" />
                    </Field>
                  </div>
                  <Field label="Email">
                    <Input type="email" placeholder="you@company.com" name="email" />
                  </Field>
                  <Field label="Ticket">
                    <Select name="ticket" defaultValue="">
                      <option value="" disabled>
                        Choose a ticket
                      </option>
                      {event.tickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {ticket.name} —{" "}
                          {ticket.priceCents > 0
                            ? formatMoney(ticket.priceCents, ticket.currency)
                            : "Free"}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button type="button" size="lg" className="w-full">
                    Complete registration
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" /> Secure checkout · GDPR &
                    CCPA-ready
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LogoMark className="size-6" /> Powered by{" "}
            <span className="font-semibold text-foreground">MeetLynq</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Meet smarter. Connect faster. Measure what matters.
          </p>
        </div>
      </footer>
    </div>
  );
}
