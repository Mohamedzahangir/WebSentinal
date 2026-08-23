# WebSentinel

**Web intelligence that never goes blind.**

WebSentinel is an autonomous web-intelligence platform built for the WeMakeDevs **Scrape-Verse** hackathon. It monitors websites for structured data (products, prices, availability), detects when a scraper silently breaks because the site changed, diagnoses the failure, repairs the Bright Data Collector through Bright Data's AI self-healing, and verifies the recovered data â€” all from one premium dashboard.

---

## Problem

Web scrapers break when websites change.

A renamed CSS class, a redesigned product grid, or a new lazy-loading pattern quietly turns yesterday's working scraper into an empty spreadsheet. Nobody notices until the data was needed â€” and by then the history is gone.

## Solution

WebSentinel closes the loop:

```text
DETECT â†’ DIAGNOSE â†’ HEAL â†’ APPROVE â†’ VERIFY â†’ RECOVER
```

> **A website changed, the scraper broke, WebSentinel noticed it, diagnosed it,
> repaired the Bright Data Collector, verified the data, and kept the pipeline alive.**

---

## Architecture

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                       Next.js 16 (App Router)                    â”‚
â”‚                                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ UI (React 19 + Tailwind v4) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Landing Â· Dashboard Â· Sources Â· Collector Â· Self-Heal Â·  â”‚   â”‚
â”‚  â”‚  Data Explorer              (polling client, dark-first)  â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                 â”‚ fetch /api/*                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€ Server-side API routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  /api/sources        create & list sources                â”‚   â”‚
â”‚  â”‚  /api/collectors/*   create Â· run Â· inspect collectors    â”‚   â”‚
â”‚  â”‚  /api/healing/*      detect Â· diagnose Â· heal Â· approve   â”‚   â”‚
â”‚  â”‚  /api/dashboard      metrics + activity aggregation       â”‚   â”‚
â”‚  â”‚  /api/data           extracted-records explorer           â”‚   â”‚
â”‚  â”‚  /api/demo           labeled Demo Mode controls           â”‚   â”‚
â”‚  â””â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚     â”‚              â”‚              â”‚                             â”‚
â”‚  â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”‚
â”‚  â”‚ Bright     â”‚ â”‚ Health     â”‚ â”‚ AI diagnosis      â”‚            â”‚
â”‚  â”‚ Data CLI   â”‚ â”‚ engine     â”‚ â”‚ OpenAI or local   â”‚            â”‚
â”‚  â”‚ wrapper    â”‚ â”‚ (anomaly)  â”‚ â”‚ deterministic     â”‚            â”‚
â”‚  â””â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â”‚
â””â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
      â”‚  bdata scraper create/run/heal/approve
â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   Bright Data Scraper Studio                     â”‚
â”‚    real Collectors (c_xxxxxxxx) with AI self-healing gates       â”‚
â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
      â”‚
â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Supabase/PostgreSQL when configured,
â”‚  Persistence layer   â”‚  otherwise a zero-config local JSON store
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Features

- **Natural-language scraper creation** â€” describe what you want ("track product name, price, availability, discount and rating") and Bright Data's AI builds the collector.
- **Bright Data Collector integration** â€” every source maps to a real collector (`c_xxxxxxxx`).
- **Extraction health monitoring** â€” record count, required-field presence, null values, schema consistency and volume trends roll up to a per-source health score.
- **Failure detection** â€” automatic anomaly detection on every completed run.
- **AI diagnosis** â€” LLM-generated root cause when `OPENAI_API_KEY` is set; deterministic analysis engine otherwise.
- **Self-healing** â€” the Bright Data CLI generates a repair proposal that stops at a human approval gate.
- **Repair approval** â€” reject or approve; approval resumes Bright Data's gate and triggers verification.
- **Recovery verification** â€” a fresh extraction run must pass health checks before the event is marked **RECOVERED âœ“**.
- **Data explorer** â€” searchable, sortable, filterable table of everything extracted.
- **Monitoring dashboard** â€” sources, health bars, records chart, live activity feed.
- **Demo Mode** â€” a clearly labeled end-to-end simulation of a failure + recovery for presentations.

## Bright Data Integration (real)

WebSentinel drives the installed Bright Data CLI (`@brightdata/cli`, command `bdata`) server-side only:

| Step | Command | What happens |
|------|---------|--------------|
| Create | `bdata scraper create <url> "<description>" --json` | AI-generates a collector, returns `collector_id` (`c_xxx`) |
| Run | `bdata scraper run <collector_id> <url> --json` | Extracts structured records |
| Detect | *(internal)* | Health engine compares runs and raises anomalies |
| Diagnose | *(internal + optional LLM)* | Root cause, confidence, affected fields |
| Heal | `bdata scraper heal <collector_id> "<prompt>" --json` | Bright Data proposes a fix and stops at its approval gate |
| Approve | `bdata scraper approve <collector_id> --auto-save --json` | Resumes Bright Data's gate, saves template v2 |
| Verify | `bdata scraper run <collector_id> ...` again | Recovery confirmed before the event is marked RECOVERED |

The same collector ID stays visible across the entire healing timeline. Stdout/stderr, exit codes and parsed JSON envelopes are captured on every call.

### Authenticating the CLI

```bash
npx @brightdata/cli login   # opens the browser; credentials stored locally
npx @brightdata/cli zones   # verify: should list your zones
```

Optionally set `BRIGHTDATA_API_KEY` to override the CLI's stored credentials.

## Demo Mode

A live website rarely breaks on cue during a presentation, so WebSentinel ships a **clearly labeled Demo Mode**:

1. Starts from healthy data
2. Simulates a website structure change (extraction drops to 0 records)
3. Runs anomaly detection automatically
4. Shows the AI diagnosis with confidence score
5. Presents the repair proposal
6. Waits for your approval
7. Applies the simulated repair
8. Verifies recovery and restores the data
9. Updates every dashboard metric

Every demo artifact is flagged `simulated: true` in the data model and carries a violet **DEMO** badge in the UI â€” it is never mixed up with real Bright Data events. The real pipeline remains fully available alongside it.

## Getting Started

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
```

Copy `.env.example` to `.env.local` and fill in what you have â€” **everything is optional**:

| Variable | Purpose |
|----------|---------|
| `BRIGHTDATA_API_KEY` | Optional override for `bdata login` credentials (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Persist to Supabase; without them a local JSON store under `.websentinel/` is used |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Only needed if you add client-side Supabase queries |
| `OPENAI_API_KEY` | LLM diagnoses; deterministic engine used when absent |

Supabase schema lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## Security

- All Bright Data, Supabase service-role and OpenAI calls happen in server-side route handlers.
- No API key ever reaches the browser bundle.
- `.env*` files are git-ignored; `.env.example` documents every variable.
- The Supabase adapter uses the service role exclusively on the server.

## Project Structure

```text
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
