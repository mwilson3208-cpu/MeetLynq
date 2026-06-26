# MeetLynq — Product Strategy & Build Blueprint

> The connection operating system for business events.
> **Meet smarter. Connect faster. Measure what matters.**

This document is the required pre-coding output: product strategy, feature map,
roles & permissions, database schema, page map, component map, API route map,
phased build plan, risk list, and testing plan.

---

## 1. Product Strategy Summary

**Problem.** Most event platforms stop at *attendance*. Organizers can sell
tickets and publish an agenda, but they cannot prove the event produced
business outcomes — meetings, leads, deals, referrals, and lasting community.

**Promise.** MeetLynq helps organizers launch better events, connect the right
people, increase sponsor value, reduce attendee friction, and measure real
business outcomes before, during, and after every event.

**Positioning.** Not just event software — a *connection operating system*. An
AI-powered event growth engine that plans the event, builds the site, manages
registration, recommends matches, schedules meetings, supports sponsors,
captures leads, reduces no-shows, and produces post-event ROI reports.

**Primary segments.** Conferences, expos, trade shows, networking events,
investor events, masterminds, author/coaching events, business summits, and
year-round professional communities.

**Why we win.**
- Outcome-driven: every feature ladders up to measurable ROI.
- AI that is *helpful but controlled* — organizers review, edit, approve, reject.
- No-code, no-HTML builder for pages and emails.
- PWA-first attendee access (no app download); offline & low-bandwidth check-in.
- Simple for a first networking night, powerful enough for a 10k-person expo.

---

## 2. Feature Map

| Module | Core capabilities |
|---|---|
| **Event Builder** | No-code pages, sections, branding, SEO, reusable templates, AI copy |
| **Registration** | Flexible forms, free/paid/VIP/group tickets, coupons, early-bird, approval, waitlist, Stripe, QR, badges |
| **Profiles** | Participant, company, speaker, marketplace profiles; goals, looking-for/offering, interests, availability |
| **Meetings & Networking** | 1:1 / group / many-to-many, slots, tables, online video, requests, reminders, no-show tracking, conversations |
| **AI Matchmaking** | Score, reason, opener, goal, mutual interests, fit types, organizer rules + manual override |
| **Agenda** | Sessions, tracks, breakouts, capacity, session registration, Q&A, polls, ratings, replay, hybrid |
| **Communication** | Email campaigns, segments, automations, push (PWA), SMS-ready, AI email assistant, open/click tracking |
| **Sponsors & Exhibitors** | Levels, logo placement, sponsored sessions, lead capture, QR scanning, booth check-ins, ROI reports |
| **Post-Event** | Surveys, NPS, ratings, analytics, lead quality, AI summaries, CRM export, follow-up campaigns |
| **Platform** | Pricing engine, launch wizard, AI setup, integrations, webhooks, public API, community mode, governance |

---

## 3. User Roles & Permissions

| Role | Scope | Key permissions |
|---|---|---|
| **Platform admin** | Global | Impersonation-protected admin, audit logs, compliance controls |
| **Event organizer (Owner)** | Organization | Everything: events, billing, team, data export |
| **Organizer admin** | Organization | Manage events, registration, sponsors; not billing/ownership |
| **Team member** | Organization | Manage assigned events & content; no billing/team |
| **Check-in staff** | Event | Check-in dashboard, badge printing only |
| **Speaker** | Event | Speaker portal: sessions, bio, resources, Q&A moderation |
| **Sponsor** | Event | Sponsor portal: profile, leads, meeting requests, ROI |
| **Exhibitor** | Event | Exhibitor portal: booth, lead pipeline, scanning |
| **Company profile owner** | Event | Company profile, team, lead dashboard |
| **Attendee** | Event | Attendee portal (PWA): profile, matches, meetings, agenda, messages |
| **Marketplace participant** | Event | Post offers/needs, contact, request meetings |

Permissions are enforced by `User.role` + `OrganizationMember.role`, with a
permission matrix surfaced in **Team & roles**. Audit logs capture sensitive
actions; data export and deletion are owner-controlled.

---

## 4. Database Schema (40 tables)

Implemented in `prisma/schema.prisma`. Local/dev uses SQLite for zero-config
runnability; production targets PostgreSQL (swap provider + native enums).

**Identity & tenancy:** `users`, `organizations`, `organization_members`
**Events & builder:** `events`, `event_pages`, `event_sections`
**Registration & payments:** `registrations`, `tickets`, `coupons`, `orders`, `payments`, `check_ins`, `badges`
**Profiles:** `participants`, `companies`, `speakers`, `sponsors`, `exhibitors`, `marketplace_posts`
**Agenda:** `session_tracks`, `sessions`, `session_registrations`
**Meetings:** `meeting_locations`, `meeting_slots`, `meetings`, `meeting_participants`, `match_scores`
**Conversations:** `conversations`, `conversation_members`, `conversation_messages`
**Communication:** `email_campaigns`, `notifications`
**Surveys & reporting:** `surveys`, `survey_questions`, `survey_responses`, `ratings`, `reports`, `leads`
**Integrations & governance:** `integrations`, `webhooks`, `audit_logs`

Enum-like values are documented in `src/lib/constants.ts`; list/JSON fields are
stored as JSON strings and parsed via `parseJson`.

---

## 5. Page Map

**Marketing:** `/` landing · `/pricing`
**Auth:** `/login` · `/signup`
**Dashboard (org):** `/dashboard` · `/dashboard/events` · `/dashboard/events/new` ·
`/dashboard/community` · `/dashboard/notifications` · `/dashboard/team` ·
`/dashboard/integrations` · `/dashboard/billing` · `/dashboard/admin`
**Event hub (`/dashboard/events/[id]/…`):** overview · builder · registration ·
tickets · attendees · check-in · badges · agenda · speakers · directory ·
companies · marketplace · matchmaking · meetings · conversations · sponsors ·
exhibitors · emails · surveys · reports
**Public & portals:** `/e/[slug]` public event microsite · `/portal` attendee portal

Every page has a primary action; list pages provide search, filter, and export
affordances and strong empty states.

---

## 6. Component Map

**UI primitives** (`src/components/ui`): `button`, `card`, `badge`, `input`
(Input/Textarea/Select/Label/Field), `table`, `misc` (Avatar, Separator,
Progress, EmptyState, StatCard, PageHeader, TabNav).
**Layout** (`src/components/layout`): `sidebar`, `topbar`, `event-nav`.
**Brand** (`src/components/brand`): `logo` (LogoMark + wordmark).
**Marketing** (`src/components/marketing`): `nav` (MarketingNav, MarketingFooter).
**Auth** (`src/components/auth`): `auth-form` (LoginForm, SignupForm).

**Lib** (`src/lib`): `db` (Prisma singleton), `auth` (scrypt + HMAC session),
`queries` (org/event guards + stats), `ai` (mock-able provider), `email`
(mock-able provider), `constants`, `utils`.

---

## 7. API Route Map

The app is server-first (Server Components + Server Actions). HTTP routes back
external integrations and programmatic access:

- `POST /api/webhooks/stripe` — payment & refund events (signature-verified in prod)
- `GET  /api/health` — liveness/readiness probe
- `GET  /api/events/[slug]` — public read API for an event (powers PWA / embeds)
- `POST /api/ai/generate` — controlled AI generation endpoint (returns reviewable copy)

Server Actions handle auth (`login`, `signup`, `logout`, `demoLogin`) and event
creation (`createEvent`). Future: registration submit, meeting requests,
campaign send — all via actions or `/api/*`.

---

## 8. Build Plan by Phase

- **Phase 1 — Foundation:** auth, organizations, event creation, builder,
  registration, tickets, payments (mock), attendee profiles, public event page,
  organizer dashboard. ✅ delivered
- **Phase 2 — Operations:** check-in, badges, agenda, sessions, speakers, email
  notifications, participant directory, company profiles. ✅ delivered
- **Phase 3 — Networking:** meetings, matchmaking, conversations, marketplace,
  meeting locations/slots, online video hooks. ✅ delivered
- **Phase 4 — Revenue:** sponsors, exhibitors, lead capture, sponsor/exhibitor
  reports. ✅ delivered
- **Phase 5 — Intelligence:** surveys, ratings, analytics, AI reports, CRM
  integrations, year-round community mode. ✅ delivered (foundation)

---

## 9. Risk List

| Risk | Mitigation |
|---|---|
| Payment correctness & refunds | Stripe is isolated behind an interface; mock provider for dev; webhook signature verification in prod |
| AI hallucination / off-brand copy | Mock-able provider; **all** AI output is reviewable/editable; nothing auto-publishes |
| Matchmaking fairness & bias | Organizer-controlled rules + manual override + quality feedback loop |
| Data privacy (GDPR/CCPA) | Consent logs, audit logs, data export/deletion, role-based access, encrypted-field strategy |
| Scale (10k-attendee events) | Indexed queries, scoping by event/org, pagination-ready reads; Postgres in prod |
| Vendor lock-in (DB/email/AI/video) | Thin provider interfaces (`db`, `email`, `ai`, video hooks) — swappable |
| Venue connectivity | Offline check-in mode + low-bandwidth mode |
| Multi-tenant data isolation | Every query scoped via `requireOrg` / `getEventOr404`; ownership checks |

---

## 10. Testing Plan

- **Type safety:** `npm run typecheck` (tsc strict) — gate on every change.
- **Lint:** `npm run lint` (eslint-config-next).
- **Build:** `npm run build` (Next production build).
- **Data layer:** `npm run db:reset` reseeds deterministically; seed acts as an
  integration smoke test across all 40 tables.
- **Flows (manual demo checklist in `README.md`):** signup → create event →
  build page → tickets → register → check-in → sessions → sponsors → directory →
  matchmaking → meetings → emails → surveys → reports → export.
- **Responsive:** layouts use mobile-first Tailwind; sidebar collapses < lg.
- **Accessibility:** semantic landmarks, labelled fields, focus-visible rings,
  color-contrast-aware tokens.
- **Future automated tests:** Vitest for `lib/*` (auth hashing, utils, ai),
  Playwright for the core organizer flow.
