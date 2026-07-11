# Security

## Required configuration

| Variable | Why it matters |
| --- | --- |
| `AUTH_SECRET` | Signs session cookies (HMAC-SHA256). **Must** be set to a strong random value in production — generate with `openssl rand -base64 32`. The app **refuses to sign or verify sessions in production** if this is missing or left at the default, rather than falling back to a public constant (which would let anyone forge a session). |
| `DATABASE_URL` / `POSTGRES_PRISMA_URL` | Postgres connection. Pooled (pgbouncer) URL for the serverless runtime. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Server-only. Payments run in mock mode when absent. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (never `NEXT_PUBLIC_`). Used for storage uploads. |

Only `NEXT_PUBLIC_*` values reach the browser, and the ones used
(`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
are non-secret by design. `.env` is git-ignored; only `.env.example` (placeholders) is committed.

## Controls in place

- **Sessions**: HMAC-signed cookies, `httpOnly`, `sameSite=lax`, `secure` in
  production, 30-day expiry. MAC comparison uses `timingSafeEqual`.
- **Passwords**: `scrypt` with a per-user random salt; verification is
  constant-time.
- **Authorization**: every organizer action and the CSV export are scoped
  through `getEventOr404` (404s on another org's data); the AI endpoint
  requires a session.
- **Injection**: all database access goes through Prisma's parameterized
  queries — no string-built SQL. The one `$queryRaw` is a constant health probe.
  React escapes all rendered user content; the sole `dangerouslySetInnerHTML`
  renders a QR SVG generated server-side from a system `cuid`, never user input.
- **Input hardening**: public signup/registration validate email format and
  bound every free-text field server-side (a direct POST can't bypass the
  browser). Numeric fields (coupon %, price) are range-checked; the AI endpoint
  rejects non-object bodies.
- **Uploads**: type-allowlisted (png/jpeg/webp/gif/svg), 5 MB cap, and the
  object key is built from a sanitized prefix + restricted extension (no path
  separators).
- **Webhooks**: the Stripe webhook verifies the signature with
  `STRIPE_WEBHOOK_SECRET` before acting.

## Known limitations

- **Rate limiting**: login, signup, and public registration are not rate
  limited. Effective throttling in a serverless deployment needs a shared store
  (e.g. Upstash/Redis) or the platform WAF; add one before opening to untrusted
  traffic at scale.
- **Demo login**: the "Try the live demo workspace" button signs the visitor in
  as the shared demo organizer. This is intentional and scoped to the demo org's
  data only; remove `demoLogin` for a non-demo deployment.
