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

## Architecture
- `src/index.js` — entry: tiny HTTP health server + starts the cron scheduler.
- `src/scheduler.js` — finds entries where `status==="scheduled"` and `publishAt <= now`, dispatches them.
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

## Status of the "Next tasks" checklist
- [x] Instagram video/REELS container **status polling** before publish (`instagram.js`).
- [x] TikTok publish **status polling** via `/v2/post/publish/status/fetch/` (`tiktok.js`).
- [x] OAuth token refresh for both platforms (`auth.js`).
- [x] `store.js` supports **Postgres** (set `DATABASE_URL`) as well as JSON files.
- [ ] Build a thin **shared API** so the browser Studio writes approved copy + schedule here.
- [ ] Wire `analytics.js` results back into a feed the Studio's Insights tab can read.
- [ ] Add a retry/backoff + dead-letter for failed posts.

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
