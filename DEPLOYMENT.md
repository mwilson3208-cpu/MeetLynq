# Deploying MeetLynq to Vercel + Supabase

MeetLynq runs on **Vercel** (Next.js) with a **Supabase PostgreSQL** database.

A Supabase project has already been provisioned for this app:

| | |
|---|---|
| Project name | **MeetLynq** |
| Project ref | `gydifuojjfevavawpllf` |
| Region | `us-west-1` |
| Dashboard | https://supabase.com/dashboard/project/gydifuojjfevavawpllf |

---

## 1. Get the database connection string

In the Supabase dashboard → **Project Settings → Database → Connection string**:

- **Pooled / "Transaction" (port 6543)** → use for the app runtime on Vercel (serverless).
  Append `?pgbouncer=true`:
  ```
  postgresql://postgres.gydifuojjfevavawpllf:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- **Direct (port 5432)** → use for running migrations/seed from your machine:
  ```
  postgresql://postgres:[PASSWORD]@db.gydifuojjfevavawpllf.supabase.co:5432/postgres
  ```

If you don't know the password, click **Reset database password** in that screen.

---

## 2. Create the schema and seed demo data

From your machine (one-time), using the **direct** connection string:

```bash
git clone <this repo> && cd MeetLynq
npm install
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.gydifuojjfevavawpllf.supabase.co:5432/postgres"
npm run db:push     # creates all 40 tables
npm run db:seed     # loads the demo org, event, and data
```

This seeds the demo workspace and the public event `growthscale-summit-2026`.

---

## 3. Create the Vercel project

1. Go to **https://vercel.com/new** and **Import** the GitHub repo `mwilson3208-cpu/MeetLynq`.
2. Framework preset: **Next.js** (auto-detected). Build command and output are auto-detected
   (`next build`; the repo's `build` script also runs `prisma generate`).
3. Add **Environment Variables** (Project Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the **pooled** string from step 1 (with `?pgbouncer=true`) |
   | `AUTH_SECRET` | a random 32-byte secret — generate with `openssl rand -base64 32` |
   | `NEXT_PUBLIC_APP_URL` | your Vercel URL, e.g. `https://meetlynq.vercel.app` |
   | `EMAIL_PROVIDER` | `mock` (or `resend`/`postmark`/`sendgrid` + `EMAIL_API_KEY`) |
   | `AI_PROVIDER` | `mock` (or `anthropic`/`openai` + `AI_API_KEY`) |
   | `VIDEO_PROVIDER` | `mock` |

4. Click **Deploy**.

> Optional: connect the project via the Vercel ↔ Supabase integration to inject
> `DATABASE_URL` automatically instead of pasting it.

---

## 4. Verify

- `https://<your-app>/api/health` → `{"status":"ok","db":"up"}`
- `https://<your-app>/e/growthscale-summit-2026` → the public event page
- Sign in at `/login` with `organizer@meetlynq.com` / `password123`

---

## Notes

- **Pooled vs direct:** Vercel functions are serverless, so always point `DATABASE_URL`
  at the **transaction pooler (6543)** with `?pgbouncer=true`. Use the **direct (5432)**
  connection only for `prisma db push` / migrations.
- **Provider interfaces:** payments (Stripe), email, AI, and video are behind swappable
  interfaces and default to mock — set the matching `*_PROVIDER` + key env vars to go live.
- **Secrets:** never commit real connection strings or `AUTH_SECRET`; set them in Vercel.
