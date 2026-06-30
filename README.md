# ResuMatch

ATS-ready resumes & smart job matches for Indian freshers. Upload a resume →
AI parses + rewrites it ATS-safe → ranked job matches → application tracker →
skill-gap suggestions. **100% free-tier stack.**

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind + custom shadcn/ui primitives
- **Supabase** (Postgres + Auth + Storage) — free tier
- **Groq** AI (OpenAI-compatible endpoint, model `openai/gpt-oss-20b`) — free dev tier
- **jspdf** for client-side ATS PDF export
- **pdf-parse** + **mammoth** for resume text extraction

## Features

- Email/password + Google OAuth (via Supabase Auth)
- AI resume parsing + ATS-safe rewrite (Groq, strict JSON output)
- Pure-JS job matching (60% skill Jaccard, 25% role fuzzy match, 15% experience)
- Skill-gap suggestions mapped to free learning resources
- Kanban application tracker (saved → applied → interview → rejected)
- Fully responsive, navy × amber "Notion meets LinkedIn" design

---

## 1. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and **Run**. This creates all tables, RLS policies, the profile trigger, the
   private `resumes` storage bucket, and 18 seed jobs.
3. **Authentication → Providers → Google**: enable it and paste your Google
   OAuth **Client ID** and **Client Secret** (from Google Cloud Console).
4. In **Google Cloud Console → Credentials → your OAuth client**, add the
   authorized redirect URI:
   `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`
5. **Authentication → URL Configuration**: set the Site URL to your deployed
   URL (e.g. `https://your-app.vercel.app`) and add
   `http://localhost:3000/**` plus `https://your-app.vercel.app/**` to the
   redirect allow-list.
6. Grab your keys from **Project Settings → API**.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (keep secret) |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `GROQ_MODEL` | optional, defaults to `openai/gpt-oss-20b` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally |

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

---

## 4. Deploy to Vercel (free Hobby tier)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **import the repository**.
   Framework preset: **Next.js** (auto-detected). No build settings to change.
3. Under **Environment Variables**, add every variable below for the
   **Production** (and Preview) environments:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `GROQ_MODEL` → `openai/gpt-oss-20b`
   - `NEXT_PUBLIC_SITE_URL` → your Vercel URL, e.g. `https://your-app.vercel.app`

4. Click **Deploy**.
5. After the first deploy, copy the real Vercel URL and:
   - Update `NEXT_PUBLIC_SITE_URL` in Vercel to that URL and redeploy.
   - In **Supabase → Authentication → URL Configuration**, set the Site URL and
     add `https://your-app.vercel.app/**` to the redirect allow-list.
   - Google OAuth keeps using the Supabase callback URL, so no change there.

That's it — the app runs entirely on free tiers.

## Project structure

```
app/
  (app)/                # authenticated routes (shared AppShell layout)
    dashboard/          # resume status, matches feed, skill gaps, mini tracker
    resume/             # original vs ATS-optimized + PDF download
    applications/       # kanban board
  api/resume/parse/     # Node route: download → extract → Groq → save
  auth/callback/        # OAuth / email confirmation handler
  actions/              # server actions (applications CRUD)
  login/                # email/password + Google
components/             # AppShell, JobCard, ResumeUploader, kanban, ui/*
lib/                    # supabase clients, matching, groq, resources, queries
supabase/migrations/    # 0001_init.sql
```
