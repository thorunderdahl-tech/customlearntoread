# CLAUDE.md — Custom Learn to Read auto-publisher

## What this is
A small Node service that turns an approved content calendar into scheduled social posts
for **Custom Learn to Read** (customlearntoread.com) — personalized "learn-to-read"
children's books. It reads `data/calendar.json`, looks up the matching copy in
`data/content.json`, and publishes to Instagram / TikTok at each entry's `publishAt` time.

It lives in the `publisher/` subfolder of the customlearntoread repo so it never clashes
with the Next.js marketing/commerce site at the repo root. It is deliberately a
**scaffold**: the orchestration is real and runs today in DRY_RUN mode (logs instead of
posting). The platform calls have the correct API shapes but need approved apps + tokens
to go live.

## How to run it (works immediately, no credentials)
```bash
cd publisher
npm install
cp .env.example .env      # DRY_RUN stays true
npm run post-now          # simulates the two sample posts
npm start                 # starts scheduler + health server on :3000
```
`GET /health` and `POST /run` are exposed for manual checks.

> The core runs with **zero installed dependencies** in dry-run (custom `.env` loader,
> built-in `http`; `node-cron` and `pg` are lazy-required only when actually used), so
> `npm run post-now` works even before `npm install`.

## Command center
A self-contained Studio UI is served at **`GET /`** (open `http://localhost:3000`). It walks
the full workflow — brief → generate/edit caption → render or upload media → approve & schedule —
and has tabs for the calendar (with "run due now"), insights, and the dead-letter (with requeue).
It talks to the same-origin API and stores the API key in the browser's localStorage.

## Content creation workflow
1. **Caption** (`POST /captions/generate`) — drafts captions with Claude (`@anthropic-ai/sdk`,
   model `CAPTION_MODEL`, default `claude-opus-4-8`). Falls back to templated captions when
   `ANTHROPIC_API_KEY` is unset. Independent of `DRY_RUN` (which only gates publishing).
2. **Media** — either `POST /render` (personalized SVG book page, rasterized to PNG if `sharp`
   is installed) or `POST /media/upload` (raw binary). Both store the asset and return a public
   URL served at `GET /media/<file>` (this is the `mediaUrl` Instagram/TikTok fetch).
3. **Schedule** (`POST /studio/schedule`) — approves the copy + media and creates the calendar entry.

## Architecture
- `src/index.js` — entry: starts the shared API/health server + the cron scheduler.
- `src/api.js` — HTTP API + serves the Studio UI (`public/index.html`) and `/media/*`.
- `src/captions.js` — AI caption drafting (Anthropic SDK, lazy-loaded) + template fallback.
- `src/media.js` — local-disk media hosting (swap for S3/R2 in prod); served at `/media/<file>`.
- `src/render.js` — personalized book-page renderer (SVG, optional PNG via `sharp`).
- `src/scheduler.js` — finds due entries, dispatches them, and handles retry/backoff + dead-letter.
- `src/publishers/` — one module per channel (`instagram.js`, `tiktok.js`) + a router `index.js`.
- `src/auth.js` — OAuth token storage + refresh for both platforms.
- `src/store.js` — persistence selector: JSON files by default, Postgres when `DATABASE_URL` is set.
- `src/store.json.js` / `src/store.postgres.js` — the two storage backends.
- `src/analytics.js` — stubs to pull metrics back (correct endpoint shapes).
- `src/config.js` — env loading; `DRY_RUN` defaults to **true** unless set to `"false"`.
- `src/migrate.js` — seeds Postgres from the JSON files.
- `data/` — sample `calendar.json` + `content.json` you can replace.

### Data shapes
Calendar entry: `{ id, channel, contentId, publishAt(ISO), status, theme }`
`status`: `scheduled | posted | failed`.
Content: `{ id, caption, mediaUrl, mediaType: "IMAGE"|"REELS"|"VIDEO" }`
`mediaUrl` must be a PUBLIC URL (Instagram and TikTok PULL_FROM_URL both fetch the asset).

## The real bottleneck (NOT code — humans must do these)
1. **Instagram:** IG must be Business/Creator + linked to a Facebook Page. Create a Meta
   app, request the Content Publishing permission, pass **App Review**, get a long-lived token.
2. **TikTok:** Register a TikTok for Developers app, request Content Posting API access,
   pass **audit** (unaudited apps can only post `SELF_ONLY`), verify the domain for PULL_FROM_URL.
Until those land, keep `DRY_RUN=true`.

## Status of the "Next tasks" checklist — all done
- [x] Instagram video/REELS container **status polling** before publish (`instagram.js`).
- [x] TikTok publish **status polling** via `/v2/post/publish/status/fetch/` (`tiktok.js`).
- [x] OAuth token refresh for both platforms (`auth.js`).
- [x] `store.js` supports **Postgres** (set `DATABASE_URL`) as well as JSON files.
- [x] Thin **shared API** (`api.js`) so the browser Studio writes approved copy + schedule here.
- [x] `analytics.js` exposes an **Insights feed** (`GET /insights`) keyed to posted entries.
- [x] **Retry/backoff + dead-letter** for failed posts (`scheduler.js`).
- [x] **AI caption generation** (`captions.js`), **media hosting** (`media.js`), and a
      **book-page renderer** (`render.js`) — wired into a **command-center UI** at `/`.

### Shared API (for the browser Studio)
All JSON. If `API_KEY` is set it's required on every route except `/health`
(send `X-API-Key: <key>` or `Authorization: Bearer <key>`). `CORS_ORIGIN` controls
the allowed browser origin.

| Method & path        | Purpose |
|----------------------|---------|
| `GET  /health`       | liveness + `dryRun` flag (no auth) |
| `POST /run`          | process all currently-due entries now |
| `GET  /calendar`     | list calendar entries |
| `POST /calendar`     | upsert a calendar entry |
| `GET  /content`      | list approved copy |
| `POST /content`      | upsert content |
| `POST /studio/schedule` | approve copy + schedule it in one call (`{ content:{…}, channel, publishAt, theme }`) |
| `GET  /insights`     | analytics feed for the Insights tab |
| `GET  /failures`     | dead-lettered entries (status `failed`) |
| `POST /retry`        | requeue a dead-lettered entry (`{ id }`) |
| `GET  /`             | the Studio command-center UI (no auth) |
| `POST /captions/generate` | draft captions (`{ childName, theme, channel?, count? }`) |
| `POST /render`       | render a personalized book page (`{ childName, theme }`) |
| `POST /media/upload` | store a raw binary upload (`?filename=`, body = bytes) |
| `GET  /media/<file>` | serve a stored asset (no auth — platforms fetch it) |

### Retry / dead-letter
On failure an entry is rescheduled with exponential backoff
(`RETRY_BASE_MS * 2^(attempt-1)`, capped at `RETRY_MAX_MS`); `nextAttemptAt` gates when
it's eligible again. After `RETRY_MAX_ATTEMPTS` it's dead-lettered (status `failed`),
surfaced at `GET /failures`, and requeueable via `POST /retry`.

## Deploy (Railway)
- Push to GitHub, create a Railway project from the repo, set **root directory** to `publisher/`.
- Railway auto-detects Node and runs `npm start`.
- Add the Postgres plugin; Railway injects `DATABASE_URL`. Run `npm run migrate` once to seed.
- Set env vars from `.env.example` in the Railway dashboard (keep `DRY_RUN=true` until approved).
- The cron lives in-process (node-cron); no separate scheduler service needed.

## Guardrails
- Never commit `.env` or real tokens (already in `.gitignore`).
- Keep `DRY_RUN=true` until you've personally posted one test successfully.
- In dry-run, posts stay `scheduled` (not marked posted) so they can be re-tested.
