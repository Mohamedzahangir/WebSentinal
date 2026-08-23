# WebSentinel

Web intelligence that never goes blind.

WebSentinel is an autonomous web-intelligence platform built for the WeMakeDevs Scrape-Verse hackathon. It watches websites for structured data (products, prices, availability), catches it when a scraper silently breaks because the site changed, diagnoses the failure, repairs the Bright Data Collector through Bright Data's AI self-healing, and verifies the recovered data. All from one dashboard.

Live demo: [websentinal.vercel.app](https://websentinal.vercel.app)

---

## The problem

Web scrapers break when websites change.

A renamed CSS class, a redesigned product grid, or a new lazy-loading pattern can quietly turn yesterday's working scraper into an empty spreadsheet. Nobody notices until the data is needed, and by then the history is gone.

## The solution

WebSentinel closes the loop:

```
DETECT -> DIAGNOSE -> HEAL -> APPROVE -> VERIFY -> RECOVER
```

A website changes, the scraper breaks, WebSentinel notices, diagnoses it, repairs the Bright Data Collector, verifies the data, and keeps the pipeline alive.

---

## Features

- **Natural-language scraper creation.** Describe what you want to track ("product name, price, availability, discount, rating") and Bright Data's AI builds the collector.
- **Bright Data Collector integration.** Every source maps to a real collector (`c_xxxxxxxx`).
- **Extraction health monitoring.** Record count, required-field presence, null values, schema consistency, and volume trends roll up into a per-source health score.
- **Failure detection.** Automatic anomaly detection on every completed run.
- **AI diagnosis.** LLM-generated root cause when `OPENAI_API_KEY` is set, a deterministic analysis engine when it isn't.
- **Self-healing.** The Bright Data CLI generates a repair proposal and stops at a human approval gate.
- **Repair approval.** Approve or reject the fix. Approval resumes Bright Data's gate and triggers verification.
- **Recovery verification.** A fresh extraction run has to pass health checks before an event gets marked RECOVERED.
- **Data explorer.** A searchable, sortable, filterable table of everything extracted.
- **Monitoring dashboard.** Sources, health bars, a records chart, and a live activity feed.
- **Demo Mode.** A clearly labeled end-to-end simulation of a failure and recovery, built for presentations.

---

## Architecture

```
+--------------------------------------------------------------+
|                    Next.js 16 (App Router)                   |
|                                                                |
|  UI: React 19 + Tailwind v4                                   |
|  Landing / Dashboard / Sources / Collector / Self-Heal /      |
|  Data Explorer (polling client, dark-first)                   |
|                        |                                       |
|                        | fetch /api/*                          |
|                        v                                       |
|  Server-side API routes                                        |
|  /api/sources        create & list sources                     |
|  /api/collectors/*   create, run, inspect collectors           |
|  /api/healing/*      detect, diagnose, heal, approve            |
|  /api/dashboard      metrics + activity aggregation             |
|  /api/data           extracted-records explorer                 |
|  /api/demo           labeled Demo Mode controls                  |
|                                                                  |
|     |                    |                     |                |
|  Bright Data CLI    Health engine        AI diagnosis            |
|  wrapper             (anomaly)         OpenAI or local           |
|                                        deterministic              |
+--------------------------------------------------------------+
      |
      | bdata scraper create/run/heal/approve
      v
+--------------------------------------------------------------+
|                Bright Data Scraper Studio                     |
|   real Collectors (c_xxxxxxxx) with AI self-healing gates     |
+--------------------------------------------------------------+
      |
      v
+-----------------------+
|   Persistence layer    |  Supabase/PostgreSQL when configured,
|                         |  otherwise a zero-config local JSON store
+-----------------------+
```

---

## Bright Data integration

WebSentinel drives the installed Bright Data CLI (`@brightdata/cli`, command `bdata`), server-side only.

| Step     | Command                                                    | What happens                                                |
|----------|-------------------------------------------------------------|---------------------------------------------------------------|
| Create   | `bdata scraper create <url> "<description>" --json`         | AI generates a collector, returns `collector_id` (`c_xxx`)    |
| Run      | `bdata scraper run <collector_id> <url> --json`              | Extracts structured records                                   |
| Detect   | *(internal)*                                                 | Health engine compares runs and raises anomalies               |
| Diagnose | *(internal + optional LLM)*                                  | Root cause, confidence, affected fields                        |
| Heal     | `bdata scraper heal <collector_id> "<prompt>" --json`         | Bright Data proposes a fix and stops at its approval gate       |
| Approve  | `bdata scraper approve <collector_id> --auto-save --json`     | Resumes Bright Data's gate, saves template v2                   |
| Verify   | `bdata scraper run <collector_id> ...` (again)                | Confirms recovery before the event is marked RECOVERED          |

The same collector ID stays visible across the whole healing timeline. Stdout, stderr, exit codes, and parsed JSON envelopes are captured on every call.

### Authenticating the CLI

```bash
npx @brightdata/cli login   # opens the browser, stores credentials locally
npx @brightdata/cli zones   # verify: should list your zones
```

You can optionally set `BRIGHTDATA_API_KEY` to override the CLI's stored credentials.

---

## Demo Mode

A live website rarely breaks on cue during a presentation, so WebSentinel ships a clearly labeled Demo Mode:

1. Starts from healthy data
2. Simulates a website structure change (extraction drops to 0 records)
3. Runs anomaly detection automatically
4. Shows the AI diagnosis with a confidence score
5. Presents the repair proposal
6. Waits for your approval
7. Applies the simulated repair
8. Verifies recovery and restores the data
9. Updates every dashboard metric

Every demo artifact is flagged `simulated: true` in the data model and carries a violet DEMO badge in the UI, so it never gets mixed up with real Bright Data events. The real pipeline stays fully available alongside it.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
```

Copy `.env.example` to `.env.local` and fill in what you have. Everything is optional.

| Variable                                                   | Purpose                                                                              |
|--------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `BRIGHTDATA_API_KEY`                                        | Optional override for `bdata login` credentials (server-side only)                      |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`     | Persist to Supabase. Without them, a local JSON store under `.websentinel/` is used      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                              | Only needed if you add client-side Supabase queries                                     |
| `OPENAI_API_KEY`                                             | Enables LLM diagnoses. Deterministic engine is used when it's absent                     |

Supabase schema lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

---

## Security

- All Bright Data, Supabase service-role, and OpenAI calls happen in server-side route handlers.
- No API key ever reaches the browser bundle.
- `.env*` files are git-ignored. `.env.example` documents every variable.
- The Supabase adapter uses the service role exclusively, on the server.

---

## Project structure

```
src/
  app/
    page.tsx                 landing
    (app)/                   authenticated shell (sidebar layout)
      dashboard/ sources/ collectors/[id]/ healing/[id]/ data/
    api/
      sources/ collectors/{create,run,[id]}/ runs/[id]/
      healing/{detect,diagnose,heal,approve,[id]}/
      dashboard/ events/ data/ demo/
  components/
    layout/ dashboard/ sources/ collectors/ healing/ data/ ui/
  lib/
    brightdata/   CLI wrapper + scraper service (create/run/heal/approve jobs)
    health/       extraction health + anomaly detection
    ai/           LLM diagnosis with deterministic fallback
    supabase/     admin client (service role, server-only)
    store/        persistence: Supabase backend or local JSON fallback
    demo/         labeled simulation engine
  types/
supabase/migrations/
```

---

Built for the WeMakeDevs Scrape-Verse hackathon. Powered by [Bright Data](https://brightdata.com).