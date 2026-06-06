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

## Studio command center
Open **`http://localhost:3000`** for the UI: brief → generate/edit a caption → render or upload
media → approve & schedule, plus calendar, insights, and dead-letter tabs. Caption drafting uses
Claude when `ANTHROPIC_API_KEY` is set (model `CAPTION_MODEL`, default `claude-opus-4-8`), and
falls back to templates otherwise. Rendered/uploaded media is served at `/media/<file>` as the
public `mediaUrl` the platforms fetch.

## Endpoints (shared Studio API)
- `GET /health` — liveness + current `dryRun` flag (no auth).
- `POST /run` — process all currently-due entries on demand.
- `GET/POST /calendar`, `GET/POST /content` — read/upsert schedule + copy.
- `POST /studio/schedule` — approve copy and schedule it in one call.
- `GET /insights` — analytics feed for the Insights tab.
- `GET /failures` + `POST /retry` — view and requeue dead-lettered posts.

Set `API_KEY` to require `X-API-Key` / `Authorization: Bearer` on every route except
`/health`, and `CORS_ORIGIN` to the Studio's origin. See [`CLAUDE.md`](./CLAUDE.md) for the
full table and the retry/backoff details.

## Storage
JSON files under `data/` by default. Set `DATABASE_URL` (e.g. Railway Postgres) to switch
to Postgres; run `npm run migrate` once to create tables and seed from the JSON files.
