# Go-live notes — reading engine, story system, art, read-along, feedback, placement

_Everything below is written and type-clean. This is what to do to ship it._

## Airtable columns — DONE (created live in the "CustomLearnToRead Orders" base)

- **Parent read-along** (singleLineText) — checkout now writes `Yes`; auto-checks the
  read-along toggle in the create tool. (Checkout wiring is done in `orderToAirtableFields`.)
- **Reading feedback** (singleSelect: Too easy / Just right / Too hard) — `/api/feedback`
  writes it; surfaced in the create tool.
- **Story draft** (multilineText) and **Story status** (singleLineText) — these were
  MISSING, so saved drafts and the variety memory silently no-op'd (writes to unknown
  columns are dropped). Now created, so draft-save + anti-repeat variety actually persist.

## Manual steps

1. **Deploy** (GitHub Desktop → push → Vercel).
2. No new env vars required. Print art requests 4K for physical orders and 2K for digital
   automatically; override only if desired via `ART_IMAGE_SIZE`.

## What shipped this session

- **Reading engine (live).** Systematic phonics decodability (`lib/reading/phonics.ts`)
  replaced the old CVC heuristic in `checkStory`; generation prompts describe the same
  scope the checker enforces. Added soft `cumulative_review` and `practices_own_level`
  warnings.
- **Story system (live).** Templates, arcs, four-questions spine, and a variety engine
  (per-child anti-repeat) in `lib/reading/storySystem.ts`, wired into the generate route.
  Skills matrix surfaced on `/reading-approach`. Monthly Book Club renewals now create an
  order record per cycle (webhook `subscription_cycle`), so the fulfillment queue and the
  variety memory both work across subscription months (idempotent on invoice id).
- **Art quality.** 4K print art + a pre-flight guard that blocks upscaled (sub-300-DPI)
  pages; an art-direction expansion pass that turns one-line scenes into composed,
  print-safe direction.
- **Parent Read-Along Lines (end-to-end).** Website toggle → generation of the adult
  read-aloud line → rendering (distinct style + front-of-book key) in both print and
  the flipbook. Opt-in, off by default.
- **Placement.** Order form: sample sentences on the level dropdown, an age-based
  default ("we'll match their age"), and one optional passive-observation question that
  infers the level. Confidence-first.
- **Feedback loop.** Delivery email asks "too easy / just right / too hard"; `/api/feedback`
  records it, emails a level suggestion, and the create tool surfaces it on the next book.
  Fires at delivery — never near a renewal.

## The plan from here (placement)

Don't optimize the checkout questions further. Let the feedback loop run, then tune the
age/behavior → level mapping in `app/order/OrderForm.tsx` (`baseLevelFromAge` + the
`READ_BEHAVIOR` deltas) against real outcomes once there's data.
