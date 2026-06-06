# Custom Learn to Read — auto-publisher

Scheduled Instagram/TikTok publishing for [customlearntoread.com](https://customlearntoread.com).
Reads an approved content calendar and posts each entry at its `publishAt` time.

See [`CLAUDE.md`](./CLAUDE.md) for the full spec, architecture, and deploy notes.

## Quick start

```bash
cd publisher
npm install
cp .env.example .env      # DRY_RUN=true by default
npm run post-now          # dry-run the due sample posts
npm start                 # health server on :3000 + in-process cron
```

In **dry-run** (the default) nothing is posted — the intended API calls are logged and
due entries stay `scheduled` so you can re-run. Flip `DRY_RUN=false` only after you've
manually posted one test on each platform with approved apps + tokens.

## Endpoints
- `GET /health` — liveness + current `dryRun` flag.
- `POST /run` — process all currently-due entries on demand.

## Storage
JSON files under `data/` by default. Set `DATABASE_URL` (e.g. Railway Postgres) to switch
to Postgres; run `npm run migrate` once to create tables and seed from the JSON files.
