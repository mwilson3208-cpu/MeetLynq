# MeetLynq

**The connection operating system for business events.**
_Meet smarter. Connect faster. Measure what matters._

MeetLynq is an AI-powered event networking, matchmaking, registration, sponsor,
exhibitor, and operations platform. It helps organizers build branded events,
manage registration, schedule high-value meetings, support sponsors, and prove
event ROI — all in one place.

> Most events stop at attendance. MeetLynq turns attendance into meaningful
> connections, qualified leads, booked meetings, and measurable outcomes.

---

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS** with a hand-built shadcn-style component system
- **Prisma ORM** — SQLite for zero-config dev, portable to **PostgreSQL** for production
- Swappable provider interfaces for **payments** (Stripe), **email** (Resend/Postmark/SendGrid),
  **AI** (Anthropic/OpenAI), and **video** (Daily/Zoom/Meet/Teams)

The app runs fully offline with **no API keys** — payments, email, AI, and video
default to deterministic mock providers so the whole product is demoable.

---

## Quick start

```bash
npm install          # installs deps + generates Prisma client
cp .env.example .env # defaults are fine for local dev (SQLite)
npm run db:push      # create the SQLite schema
npm run db:seed      # load a fully-populated demo event
npm run dev          # http://localhost:3000
```

### Demo logins (after seeding)

| Role | Email | Password |
|---|---|---|
| Organizer | `organizer@meetlynq.com` | `password123` |
| Platform admin | `admin@meetlynq.com` | `password123` |

The **Sign in** page also has a one-click **"Try the live demo workspace"** button.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (next config) |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Seed deterministic demo data |
| `npm run db:reset` | Reset + reseed the database |

---

## Project structure

```
prisma/
  schema.prisma        40-table relational data model
  seed.ts              deterministic demo data
src/
  app/
    page.tsx           marketing landing
    pricing/           pricing
    login/ signup/     auth (server actions in login/actions.ts)
    dashboard/         organizer dashboard (sidebar + topbar layout)
      events/[id]/     event hub: overview, builder, registration, tickets,
                       attendees, check-in, badges, agenda, speakers, directory,
                       companies, marketplace, matchmaking, meetings,
                       conversations, sponsors, exhibitors, emails, surveys, reports
      team/ integrations/ billing/ admin/ notifications/ community/
    e/[slug]/          public event microsite
    portal/            attendee portal (PWA-style)
    api/               health, public event read, AI generate, Stripe webhook
  components/          ui/ layout/ brand/ marketing/ auth/
  lib/                 db, auth, queries, ai, email, constants, utils
docs/
  PRODUCT_STRATEGY.md  strategy, schema, page/component/API maps, plan, risks, tests
```

See [`docs/PRODUCT_STRATEGY.md`](docs/PRODUCT_STRATEGY.md) for the full blueprint.

---

## Demo checklist

An organizer can, end to end:

1. **Create an account** — `/signup` (or use the demo workspace)
2. **Create an event** — `/dashboard/events/new` (AI drafts the description)
3. **Build a branded page** — event ▸ Builder (sections, brand, SEO, AI copy)
4. **Set up tickets & registration** — event ▸ Tickets / Registration (free, paid, VIP, group, coupons, early-bird)
5. **Accept payments** — orders & payments (Stripe interface, mock in dev)
6. **Register attendees** — event ▸ Attendees (statuses, search, export)
7. **Check attendees in** — event ▸ Check-in (QR, manual, offline mode) + Badges
8. **Create speakers & sessions** — event ▸ Speakers / Agenda (tracks, breakouts)
9. **Create sponsors & exhibitors** — event ▸ Sponsors / Exhibitors (levels, lead pipeline)
10. **Create participant profiles** — event ▸ Directory / Companies / Marketplace
11. **Match attendees** — event ▸ Matchmaking (AI score, reason, opener, fit, rules)
12. **Schedule meetings** — event ▸ Meetings (slots, tables, no-show tracking) + Conversations
13. **Send event emails** — event ▸ Emails (segments, automations, AI assistant, open/click)
14. **Collect ratings & surveys** — event ▸ Surveys (NPS, ratings, AI insights)
15. **View reports** — event ▸ Reports (revenue, check-in rate, no-show rate, ROI, AI summaries)
16. **Export event data** — CRM-ready export actions across list pages
17. **Public event page** — `/e/growthscale-summit-2026`
18. **Attendee portal** — `/portal`

---

## Production notes

- **Database:** switch `datasource.provider` to `postgresql`, set `DATABASE_URL`,
  and add native enums for the documented status fields.
- **Payments/email/AI/video:** set the matching `*_PROVIDER` + key env vars to
  swap mock providers for real ones — call sites don't change.
- **Auth:** the lightweight scrypt + HMAC session is production-shaped but can be
  replaced with NextAuth or Supabase Auth without touching call sites.
- **Security & compliance:** role-based access, audit logs, consent tracking,
  data export/deletion, secure QR tokens, and rate limiting are part of the model.

---

_AI is helpful but controlled — organizers review, edit, approve, or reject all
AI-generated content. Nothing auto-publishes._
