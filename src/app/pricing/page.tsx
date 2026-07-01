import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/nav";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

const tiers = [
  {
    name: "Starter",
    price: "$0",
    cadence: "free forever",
    desc: "For first events and small networking nights.",
    cta: "Start free",
    features: ["1 active event", "Up to 100 attendees", "Branded event page", "Free & paid tickets", "Basic matchmaking", "Email confirmations"],
  },
  {
    name: "Growth",
    price: "$99",
    cadence: "per month",
    desc: "For organizers running recurring business events.",
    cta: "Start Growth",
    featured: true,
    features: ["Unlimited events", "Up to 1,000 attendees", "AI matchmaking & meetings", "Sponsor & exhibitor tools", "Email campaigns & automations", "Lead capture & ROI reports", "Check-in app & badges"],
  },
  {
    name: "Scale",
    price: "$299",
    cadence: "per month",
    desc: "For conferences, expos, and trade shows.",
    cta: "Start Scale",
    features: ["Up to 10,000 attendees", "Advanced matchmaking rules", "CRM sync (HubSpot, Salesforce…)", "Zapier & webhooks", "Year-round community mode", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "let's talk",
    desc: "For large organizations with custom needs.",
    cta: "Contact sales",
    features: ["Unlimited attendees", "Public API", "SSO & advanced permissions", "Audit logs & data controls", "Dedicated success manager", "Custom integrations & SLA"],
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="bg-brand-gradient">
          <div className="container py-16 text-center lg:py-20">
            <Badge tone="primary" className="mb-4">Transparent self-service pricing</Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Pricing that scales with your events</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Affordable enough for small business events, powerful enough for enterprise conferences.
              Start free and upgrade when you&apos;re ready.
            </p>
          </div>
        </section>

        <section className="container -mt-6 pb-20">
          <div className="grid gap-6 lg:grid-cols-4">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                  t.featured && "border-primary ring-2 ring-primary/20"
                )}
              >
                {t.featured && <Badge tone="primary" className="mb-3 w-fit">Most popular</Badge>}
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{t.price}</span>
                  <span className="text-sm text-muted-foreground">/ {t.cadence}</span>
                </div>
                <ButtonLink
                  href="/signup"
                  variant={t.featured ? "primary" : "outline"}
                  className="mt-5 w-full"
                >
                  {t.cta} <ArrowRight className="size-4" />
                </ButtonLink>
                <ul className="mt-6 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl border bg-secondary/40 p-8 text-center">
            <h2 className="text-xl font-semibold">Every plan includes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No-code event builder · PWA attendee access · Offline check-in mode · Accessibility-first design ·
              GDPR & CCPA-ready consent tracking · Secure QR tickets · Data export
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
