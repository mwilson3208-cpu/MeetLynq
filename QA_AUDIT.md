# MeetLynq Functional QA Audit

Method: production build served locally; Playwright crawler visited all 47 routes as the
correct role (public / organizer / platform admin), inventoried 1,033 links + 608 buttons,
resolved every internal link, captured console errors and failed network requests, then an
interaction prober clicked every visible enabled button (578 probed) requiring an observable
effect (navigation, dialog, DOM change, or network call). Ambiguous results were manually
verified. Core flows (auth, event creation, tickets, publish, registration, check-in, badges,
matchmaking, surveys, emails) are continuously verified by the 25-test E2E suite.

## Page-level results (all 47 routes)

Every route: HTTP 200, zero console errors, zero failed network requests, all internal links
resolve (CSV export links verified 200 text/csv via HTTP; admin links verified with admin
session). Placeholder hrefs ("#", javascript:void): none found.

## Dead interactive elements found (Status: Fail → being fixed)

| # | Page | Element | Expected behavior | Status |
|---|------|---------|-------------------|--------|
| 1 | /dashboard/events/[id]/attendees | "Add attendee" | Open dialog; create a registration manually | Fixed |
| 2 | /dashboard/team | "Invite member" → "Send invite" | Invite flow that adds an existing user to the workspace by email | Fixed |
| 3 | /dashboard/events/[id]/meetings | Status filter chips ×6 (All/Requested/…) | Filter the meetings list by status | Fixed |
| 4 | /dashboard/events/[id]/directory | "View profile" (per attendee) | Open profile dialog with attendee details | Fixed |
| 5 | /dashboard/events/[id]/directory | "Request meeting" (per attendee) | Create a REQUESTED meeting with that participant | Fixed |
| 6 | /dashboard/events/[id]/directory | "Invite attendees" | Navigate to attendees page (registration entry point) | Fixed |
| 7 | /dashboard/events/[id]/marketplace | "Contact" (per post) | Start/open a conversation with the poster | Fixed |
| 8 | /dashboard/events/[id]/marketplace | "Request meeting" (per post) | Create a REQUESTED meeting with the poster | Fixed |
| 9 | /dashboard/events/[id]/reports | "Launch post-event campaign" | Go to Emails page with campaign composer opened | Fixed |
| 10 | /dashboard/community | "Open community" | Open community detail view | Fixed |
| 11 | /dashboard/integrations | "Connect"/"Manage" ×5, "Add webhook", "Regenerate", "View docs" | Persist integration connections, webhooks, API key | Fixed |
| 12 | /dashboard/billing | "Choose" ×3, "Upgrade plan", "Update payment method" | Change workspace plan (mock-billing mode), explain payment setup | Fixed |
| 13 | /portal | "Request meeting" ×5 | Meeting request from attendee portal | Fixed |
| 14 | /speaker-portal | "Save changes", "Upload resource" | Persist speaker profile edits; upload file | Fixed |
| 15 | /sponsor-portal | "Export leads", "Request a meeting" | Download leads CSV; meeting request | Fixed |
| 16 | /exhibitor-portal | "Export leads", "Scan a badge" | Download leads CSV; open check-in scanner | Fixed |

## Verified working (prober flags cleared by manual verification)

| Page | Element | Verification |
|------|---------|--------------|
| /login, /signup | Submit buttons | Empty-form clicks blocked by HTML validation (correct); full flows pass in E2E |
| /dashboard/events/new | "Create event" | Same — E2E covers the full creation flow |
| /dashboard/events/[id]/builder | Brand color presets "Use #…" | Clicking updates the color input value (prober can't see value changes) |
| /dashboard/events/[id]/conversations | "Send" | With text typed, message appears in thread |
| /e/[slug] | "Continue to checkout" | Works after selecting a ticket quantity (correct gating) |
| CSV exports (5 pages) | "Export" links | 200 text/csv via authenticated HTTP |
| /dashboard/admin/* | All links/cards | 200 with admin session; 404 for non-admins by design |

## Fix log (all verified in-browser against a production build)

1. **Attendees "Add attendee"** — new `addAttendee` action + dialog: creates a confirmed
   registration (+ participant profile, + confirmation email, optional ticket count),
   validates email format and duplicates. Verified: registration count increments.
2. **Team invites** — new `inviteMember` action wired to both the header dialog and the
   sidebar card: adds an existing MeetLynq user to the workspace by email with a role;
   unknown emails get honest guidance (no email-invitation infrastructure exists, so
   nothing pretends to send mail). Verified: error guidance shown; membership created
   for existing users. *Assumption noted: invite-by-email-to-non-users needs email infra.*
3. **Meetings status filters** — chips are now links driving a server-side filter
   (`?status=`), matching the events page pattern; stat cards keep whole-event numbers;
   filtered-empty state added. Verified: Approved chip filters the table.
4. **Directory "View profile"** — profile dialog with full attendee details (bio, goals,
   looking for / offering, tags, intent). Verified opens/closes.
5. **Directory "Request meeting"** — dialog (on behalf of / mode / goal) → new
   `requestMeeting` action creates a REQUESTED meeting with pending invitee. Verified:
   meeting row created.
6. **Directory "Invite attendees"** — now links to the Attendees page. Verified.
7. **Marketplace "Contact"** — starts a real private conversation with the post author
   (thread appears on Conversations). *Assumption: post author is matched to a
   participant by display name; unmatched authors show guidance instead of dead buttons.*
   Verified: conversation created.
8. **Marketplace "Request meeting"** — same requestMeeting flow targeting the author.
9. **Reports "Launch post-event campaign"** — links to the Emails page. Verified.
10. **Community "Open community"** — links to the latest event's participant directory.
11. **Integrations** — full persistence: Connect/Disconnect per provider (Integration
    rows), Add webhook dialog (+ Remove per row, URL validation), real workspace API key
    (generate/regenerate, stored server-side, shown masked), View docs dialog with API
    reference. Verified: provider connects, webhook persists, key `mlq_live_…` stored.
12. **Billing** — "Choose" switches the workspace plan via server action (mock-billing
    mode, audit-logged); "Upgrade plan" anchors to the plans card; "Update payment
    method" opens an honest dialog explaining mock mode + the env vars for real Stripe;
    sample invoices are now labeled as sample data. Verified: plan persists.
13. **Attendee portal "Request meeting"** — per-match button creates a REQUESTED meeting
    from the portal participant (duplicate-guarded), button flips to "Requested".
    Verified: meeting created.
14. **Speaker portal** — "Save changes" persists title/bio/session description with a
    Saved indicator; "Upload resource" became "Add resource" (name + link, stored on the
    speaker, rendered as links). Verified both.
15. **Sponsor portal** — "Export leads" is a real CSV download; "Request a meeting"
    opens the meeting-request dialog over the event's top attendees.
16. **Exhibitor portal** — "Export leads" real CSV; "Scan a badge" links to the event
    check-in scanner.

## Final verification

- Re-probe of every fixed element: **23/23 pass** (one probe-selector artifact manually
  re-verified against the database)
- Full crawl of all 47 routes post-fix: HTTP 200 everywhere, **0 console errors,
  0 failed requests**, all links resolve (CSV/admin flags are checker artifacts,
  independently verified 200)
- Unit + integration tests: **167/167** · E2E suites: **25/25** · `tsc` + ESLint clean
- Production build: ✔

## Needs your decision (not fixable from the repo)

- **Real email invitations** (team invites to people without accounts) need an email
  provider key.
- **Real payments/invoices** need `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- **Top-bar global search** remains a visual placeholder (separate feature, not a broken
  handler — say the word and it becomes a real search).
- Portal pages (speaker/sponsor/exhibitor/attendee) are demo-persona pages by design:
  they act on the first matching profile rather than an authenticated portal login.
