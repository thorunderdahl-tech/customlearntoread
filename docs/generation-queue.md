# Unattended Generation Queue

*Added July 10, 2026. Implements Phase 0 + Phase 2 of `automation-build-plan.md`: orders generate on the server while you sleep; you review finished candidates in the morning.*

## How it works

- **`lib/pipeline.ts`** — the resumable generator. `advanceOrder()` runs one bounded chunk of work per call: story → rules-revise loop → AI grade (one revise cycle) → character sheet → pages (with vision QA + fix-note retries, best attempt kept). Progress persists to the order after **every page**, so serverless timeouts lose at most one page.
- **`/api/cron/generate`** — the drain, scheduled every 10 minutes in `vercel.json`. Resumes `Generating` orders first (books finish before new ones start), then auto-starts untouched `Paid` orders (no draft, no pipeline state — it can never trample manual work). A 16-page book completes in roughly 3–5 runs.
- **Prompts are shared** with the manual lane via `lib/artPrompts.ts` — the overnight queue and the create screen use the same character-lock/QA language by construction.

## Status machine (Airtable `Status`, options auto-created by typecast)

```
Paid → Generating → Ready for review    (all pages passed QA — review & deliver)
                  → Needs attention     (flagged pages, image cap hit, or story stuck)
```

`Designing` remains the manual lane. Delivery stays a human click.

## Where the work lands

- **Story draft** — same field the manual lane uses.
- **Pipeline state** — JSON: phase, image-call count, per-page blob URLs + QA verdicts.
- **AI images** — running image-call count (cost visibility, Phase 0).
- Art files: Vercel Blob under `candidates/{recordId}/`.

## Reviewing a candidate

Open the admin create screen, pick the order, click **"Load overnight candidate"** — the draft, character sheet, and all page art (with QA verdicts) load into the normal tiles. Redo flagged pages, "Use anyway," assemble, deliver: the existing flow, minus the hours of generation.

## Cost & safety rails

- **Image cap**: `PIPELINE_IMAGE_CAP` (default 40) per book — a runaway book stops and flags `Needs attention` instead of burning spend.
- **Kill switch**: set `AUTO_GENERATE=0` to stop auto-starting new orders (resumes still run). Manual trigger any time: `GET /api/cron/generate?key=$CRON_SECRET`.
- **Time budget**: `GENERATE_BUDGET_MS` (default 240000) per cron run; route `maxDuration = 300`.
- **Crash handling**: 3 consecutive run-level failures on one order → `Needs attention` (never silent infinite retries).

## Requirements

- Env: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (all already set for existing features).
- New dependency: `sharp` (server-side image downscaling for reference images — replaces the browser canvas the manual lane uses).
- **Vercel plan note**: a 10-minute cron schedule requires the Pro plan (Hobby allows only daily crons). On Hobby, either upgrade or point an external pinger (e.g. cron-job.org) at `/api/cron/generate?key=$CRON_SECRET` every 10 minutes.

## Deliberately NOT automated

- Approval and delivery — a human looks at every book before a family sees it.
- Assembly/PDFs — stays in the browser at review time (seconds of work, and the compositing code already lives there).
- Rush orders — the manual lane is the fast lane.
