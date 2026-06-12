# Panel Prep

Private interview simulator for the WSP USA second-round panel (Senior
Director, Government Relations — Midwest). Built from the June 2026 prep
dossier.

## Features

- **Three modes** — full six-panelist mock (shuffled, ends with "questions
  for us?"), tough-spots gauntlet, single-panelist drill.
- **Two hint levels per question** — "What are they listening for?"
  (dossier guidance) and "Show a strong answer" (a full model answer;
  bracketed `[slots]` mark places to substitute your own specifics).
- **AI coaching** — per-answer 1–5 scoring, in-character follow-up
  questions, and an end-of-session debrief scored against the
  three-messages rubric. Falls back to dossier hints if no API key is set.
- **Pacing tools** — live timer plus a spoken-length estimate (145 wpm) to
  enforce the under-2-minute panel rule.
- **Password gate** — the entire app sits behind a session cookie;
  search engines are told to stay out.

## Deploy (Vercel)

1. Import this repo at https://vercel.com/new (framework auto-detects as
   Next.js; no settings needed).
2. Add environment variables:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `SIM_PASSWORD` | yes | The login password. |
   | `ANTHROPIC_API_KEY` | for AI coaching | Powers scoring, follow-ups, debrief. |
   | `SIM_SESSION_SECRET` | optional | Cookie-signing secret (falls back to the password). |
   | `STORY_MODEL` | optional | Override the coaching model (default `claude-sonnet-4-6`). |

3. Deploy. Everything is served from `/` behind the login.

## Local dev

```bash
npm install
SIM_PASSWORD=test ANTHROPIC_API_KEY=sk-... npm run dev
```
