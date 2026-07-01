import Link from "next/link";
import {
  ArrowRight,
  CalendarCog,
  Ticket,
  Sparkles,
  Users2,
  CalendarClock,
  Mail,
  Building2,
  BarChart3,
  CheckCircle2,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/nav";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const modules = [
  { icon: CalendarCog, title: "Event builder", body: "A no-code builder for branded event pages, agendas, and registration — no HTML required." },
  { icon: Ticket, title: "Registration & tickets", body: "Free, paid, VIP, and group tickets with Stripe, coupons, early-bird pricing, and QR check-in." },
  { icon: Sparkles, title: "AI matchmaking", body: "Score, explain, and suggest the right connections — buyer/seller, investor/founder, and more." },
  { icon: CalendarClock, title: "Meeting scheduler", body: "1:1, group, and online meetings with slots, tables, reminders, and no-show tracking." },
  { icon: Users2, title: "Profiles & networking", body: "Rich participant, company, and speaker profiles with goals, offers, and private conversations." },
  { icon: Building2, title: "Sponsors & exhibitors", body: "Lead capture, QR scanning, booth check-ins, and ROI reports that prove sponsor value." },
  { icon: Mail, title: "Communication", body: "Email campaigns, automated reminders, push notifications, and an AI email assistant." },
  { icon: BarChart3, title: "Reports & ROI", body: "Revenue, NPS, lead quality, no-show rate, and AI-generated post-event summaries." },
];

const steps = [
  { n: "01", title: "Build your event", body: "Use the launch wizard and AI setup assistant to create a branded event site, agenda, and registration in minutes." },
  { n: "02", title: "Connect the right people", body: "MeetLynq scores matches, suggests openers, and books high-value 1:1 meetings automatically." },
  { n: "03", title: "Prove the outcomes", body: "Capture leads, reduce no-shows, and generate ROI reports for organizers and sponsors alike." },
];

const audiences = ["Conferences", "Expos", "Trade shows", "Networking events", "Investor events", "Masterminds", "Author events", "Coaching events", "Business summits", "Communities"];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-gradient">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="container relative py-20 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge tone="primary" className="mb-5">
                <Sparkles className="size-3" /> The connection operating system for business events
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Meet smarter. Connect faster.{" "}
                <span className="text-primary">Measure what matters.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                MeetLynq helps event organizers build branded events, manage registration, schedule
                high-value meetings, support sponsors, and prove event ROI — all in one simple platform.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Start free <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href="/e/growthscale-summit-2026" size="lg" variant="outline">
                  Explore a live event
                </ButtonLink>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                No credit card required · Demo workspace included
              </p>
            </div>

            {/* Stat band */}
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["3x", "more booked meetings"],
                ["−42%", "attendee no-shows"],
                ["100%", "no-code setup"],
                ["1", "platform for everything"],
              ].map(([k, v]) => (
                <div key={v} className="rounded-xl border bg-card/70 p-5 text-center shadow-sm backdrop-blur">
                  <div className="text-3xl font-bold tracking-tight text-primary">{k}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="border-y bg-card">
          <div className="container flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-6 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Built for</span>
            {audiences.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container py-20 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Not just event software. A growth engine.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to plan the event, connect the right people, and prove outcomes —
              before, during, and after.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((m) => (
              <div key={m.title} className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <m.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y bg-secondary/40">
          <div className="container py-20 lg:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From attendance to outcomes</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Most events stop at attendance. MeetLynq turns it into meetings, leads, and deals.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="rounded-xl border bg-card p-7 shadow-sm">
                  <div className="text-sm font-bold text-primary">{s.n}</div>
                  <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="container py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple for small events. Powerful for enterprise.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Affordable enough for a first networking night, flexible enough for a 10,000-person trade
                show — with the controls enterprise teams require.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ["Accessibility-first, multi-language-ready", Globe],
                  ["Role-based permissions, audit logs, and data export controls", ShieldCheck],
                  ["GDPR & CCPA-ready consent tracking", CheckCircle2],
                  ["PWA access — attendees never download an app", Sparkles],
                ].map(([label, Icon]) => {
                  const I = Icon as React.ElementType;
                  return (
                    <li key={label as string} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                        <I className="size-3.5" />
                      </span>
                      <span className="text-sm">{label as string}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-accent to-card p-8 shadow-sm">
              <p className="text-sm font-medium text-accent-foreground">AI event setup assistant</p>
              <div className="mt-4 space-y-3">
                {["Generated your event description ✨", "Suggested 3 ticket types", "Drafted a registration form", "Recommended 24 high-value matches"].map((t) => (
                  <div key={t} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm">
                    <CheckCircle2 className="size-4 text-success" /> {t}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                You review, edit, and approve everything. AI is helpful — never in control.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-primary">
          <div className="container py-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Turn your next event into measurable relationships.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Launch a branded event, schedule high-value meetings, and prove ROI — starting today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg" variant="secondary">
                Start free <ArrowRight className="size-4" />
              </ButtonLink>
              <Link href="/pricing" className="text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground">
                See pricing →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
