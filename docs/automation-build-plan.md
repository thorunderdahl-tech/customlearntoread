# Build Plan — Cut Labor to ~15–20 min/book

*July 3, 2026. The single highest-leverage work for margin. Ordered so each phase ships value on its own; you can stop after any phase and be better off.*

> **Status update (July 10, 2026):**
> - **Phase 0 — DONE.** Image cap (`PIPELINE_IMAGE_CAP`, default 40) + "AI images" counter shipped with the queue.
> - **Phase 2 — DONE.** Server-side resumable pipeline (`lib/pipeline.ts`) + `/api/cron/generate` drain + status machine. See `docs/generation-queue.md`.
> - **Phase 3 — partial.** No dedicated gallery yet, but "Load overnight candidate" in the create screen gives per-page QA review, redo, and deliver today.
> - **Phase 4 — DONE (predates this note).** 300 DPI + bleed, cover wrap with spine math, ≥24 even pages, print pre-flight guard are all live; hardcover wrap is explicitly guarded until real hardcover geometry exists.
> - **Phase 1 (Batch API) — still open.** Fold into the pipeline when volume justifies it.

## The problem in one sentence

Today `app/admin/create/CreateClient.tsx` (953 lines) drives the whole pipeline **interactively in the browser, one book at a time** — you sit and watch story → art → composite → deliver, clicking through retries. That's the 1–2 hr/book that makes every product unprofitable when your time is priced (see `docs/business-review-2026-07.md` §3–4). The fix is not better prompts; it's **doing the work while you sleep and reducing you to an approver.**

Target end state: an order comes in, everything generates unattended overnight, and in the morning you open one page showing finished books to approve or reject. Two clicks per book (approve story, approve art), ~15–20 min/book total. That's the difference between −$6,400/mo and +$3,500/mo at 200 orders.

---

## Phase 0 — Instrument & cap (½ day) · do first, tiny effort

Before automating, stop the bleeding and get visibility.

- **Cap generations per book.** In `app/api/admin/art/route.ts`, enforce a hard ceiling (~40 image calls/book) with a counter in the order record. Prevents a single bad order from silently costing 2–3× in Gemini spend.
- **Log spend per book.** Write image-generation count to the Airtable order (new number field `AI images`). You currently can't see which orders are expensive.
- **Add a `Generation cost` rollup** (images × current per-image rate) so unit economics are measured, not estimated.

*Ships:* cost protection + the data you need to verify the rest of this plan actually works.

## Phase 1 — Batch API for art (1 day) · ~$2/book saved, no workflow change yet

- Switch `generateImage` in `lib/gemini.ts` to Gemini's **Batch API** ($0.067 vs $0.134/image — halves art cost). Batch is asynchronous (submit → poll → collect), which is *why it pairs with Phase 2*: overnight jobs don't need instant responses.
- Keep the current synchronous path behind a flag for the **Rush add-on** ($15) — rush orders pay for the interactive/fast lane.
- Batching also naturally fits generating a whole book's ~20 pages in one submission instead of 20 sequential awaits.

*Ships:* immediate COGS reduction on every book. At 340 books/mo that's ~$680/mo.

## Phase 2 — Server-side generation queue (1–1.5 weeks) · THE labor fix

This is 80% of the value. Move generation off the browser and onto the server, triggered automatically.

**2a. Extract the pipeline from the client into a server module.**
`CreateClient.tsx` currently orchestrates calls to `/api/admin/story`, `/api/admin/art`, and `/api/admin/deliver`. Pull that orchestration into a server function `lib/pipeline.ts` → `generateBook(orderRecordId)` that runs the full sequence: story generate → `checkStory` (in `lib/leveling.ts`) → auto-revise on fail → art-direction expansion → batch art → vision QA (`visionAsk`) → auto-retry failed pages up to the Phase 0 cap → composite → store draft. No human in the loop; it just produces a *candidate* book and sets status.

**2b. Trigger it automatically.**
Two options, pick one:
- **Cron drain (simplest):** extend the existing Vercel Cron pattern (you already run `/api/cron/abandoned`). Add `/api/cron/generate` that finds orders at status `Paid / not started`, runs `generateBook`, and moves them to `Ready for review`. Runs every N minutes or nightly.
- **Webhook-triggered:** kick `generateBook` from the Stripe `checkout.session.completed` handler in `app/api/webhook/route.ts`. Faster, but long-running work in a webhook needs a queue/background invocation (Vercel background function or a lightweight queue like Upstash QStash). Cron is less infrastructure to start.

**2c. Status machine in Airtable.**
Use the existing `FULFILLMENT_STATUSES` in `lib/airtable.ts`. Flow: `Paid → Generating → Ready for review → Approved → Delivered` (plus `Needs attention` for QA-flagged or cap-hit books). Everything up to `Ready for review` is unattended.

*Ships:* your involvement drops from "run each step" to "review finished candidates." This is the phase that changes the unit economics.

## Phase 3 — Approval gallery (3–5 days) · makes review fast

Replace the interactive create screen with a read-first review screen.

- **`/admin/review`** lists every order at `Ready for review` as a card: child name, level, the full book as a page thumbnail strip, QA flags surfaced inline (which pages the vision check flagged and why), and the generated story text.
- **Two buttons per book: Approve → Deliver, or Reject → Regenerate** (with an optional note that feeds `fixNotes` already supported in the art route). Approve triggers the existing `/api/admin/deliver` path.
- **Per-page override, not per-book redo.** Let a single flagged page be regenerated without rerunning the whole book — the art route already accepts a single-page call. Most rejects are one bad page, not a bad book.
- **Batch actions:** "approve all un-flagged books" for the clean ones, so you only hand-touch the exceptions.

*Ships:* review time per clean book drops to ~1–2 min; only flagged books need real attention. This is where 15–20 min/book becomes realistic.

## Phase 4 — Print-file correctness (2–4 days) · defensive, do before scaling physical volume

Not a margin gain, but a refund/reprint avoider (see `GENERATOR-REVIEW.md`). Fold into the automated pipeline so it's enforced by code, not by you:

- Render interior at **300 DPI with 0.125" bleed** (1725×2625 px), per `docs/print-spec.md`, not the current 293/no-bleed.
- **Upscale pass** on Gemini art before compositing (effective resolution is ~180 DPI today — the main reason prints look soft).
- **Wraparound cover generator** with spine math (`pages × 0.002252"`) and barcode zone.
- **Even page count ≥ 24**, plus title/copyright/dedication front matter.
- Split outputs: home-print PDF (trim, no bleed) vs printer package (bleed interior + cover wrap).

*Ships:* printer rejections and "art looks soft" complaints stop eating margin as physical volume grows.

---

## Sequencing & why

| Phase | Effort | Primary payoff | Blocks scaling? |
|---|---|---|---|
| 0 Instrument & cap | ½ day | Stop overspend, get data | No, but do first |
| 1 Batch API | 1 day | −$2/book COGS | No |
| 2 Generation queue | 1–1.5 wk | **Labor fix — the whole ballgame** | **Yes** |
| 3 Approval gallery | 3–5 days | Fast review, 15–20 min/book | Yes |
| 4 Print correctness | 2–4 days | Stops refund/reprint losses | Yes (physical) |

Do 0 and 1 first (2 days, near-zero risk). Then 2 as the main project — nothing before it makes the business scale, and nothing after it matters until it exists. 3 makes 2 usable day-to-day. 4 before you push physical volume or ads.

**Explicitly not on this list yet:** paid acquisition, more SKUs, per-order manual features. They add cost or workload without addressing the constraint.

## Risks to watch

- **Vercel function time limits.** Full-book generation can exceed serverless timeouts (`maxDuration = 300` is already set on the art route). Batch API's async model and a cron-drain design sidestep this; a synchronous "generate whole book in one request" will not.
- **Quality regression when unattended.** The auto-retry + hard-block-on-QA-fail logic must be trustworthy before you stop watching. Roll out Phase 2 in shadow mode first: generate candidates automatically but keep approving via the old screen for a week, comparing.
- **Model dependency.** Art runs on stable `gemini-3-pro-image` (moved off the preview alias 2026-07-12). Fallback candidate: `gemini-3.1-flash-image` via `ART_MODEL` — cheaper but only 4 character refs and no style refs; re-test style before relying on it.
- **Batch latency.** Batch API can take minutes to hours; fine for overnight, not for Rush — keep the sync lane for paid rush orders.
