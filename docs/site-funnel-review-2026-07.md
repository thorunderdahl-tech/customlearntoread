# Customer-Facing Site & Funnel Review — 2026-07-11

Scope: `/` (landing), `/order` + OrderForm, `/order/success`, `/personalized-book-for` + `[name]`, `/reading-approach`, `/guarantee`, `/about`, `/privacy`, `/terms`. Every claim below verified against the current code and the 2026-07-11 pedagogy canon (`docs/pedagogy-review-2026-07.md`, `lib/leveling.ts`, `lib/reading/phonics.ts`).

**Good news first:** the reading-approach page is NOT stale — it already reflects the new canon (heart words, 4-level ladder, orthographic mapping, method-not-outcome, honest "we don't claim proven outcomes"). Parent Read-Along Lines are fully wired end-to-end (OrderForm → checkout → webhook → Airtable → story → CreateClient), so that promise is real. The funnel structure itself is solid: multi-step form with draft persistence, SEO-page name prefill, order summary rail, trust rows, post-purchase upsell.

---

## CRITICAL — promises the product can't keep

### 1. "Preview before it ships" — feature does not exist
Said in 3 places: homepage CTA microcopy (`app/page.tsx:347`), `/order` intro text, and the `/order` reassure bullets (`app/order/page.tsx:16,20`). The only "preview" in the codebase is the **admin** flipbook preview in `DeliverClient.tsx`. No customer proof/approval step exists (likeness check was deliberately deferred).
**Fix now:** change to what's true — e.g. "We personally review every page before it ships." Restore the claim when the proof feature is built.

### 2. Terms of Service describes a product you don't sell
`app/terms/page.tsx:27` — "The **Monthly** Book Club bills **monthly** until canceled." The product is the **Quarterly** Reading Club ($89 first season, then $69/season). Your legal document misstates billing cadence — chargeback/dispute ammunition.
Also stale: `app/order/success/page.tsx:42` — "If you signed up for the **monthly book club**, your **first book** will start production" (should be quarterly / set of three).

### 3. Privacy Policy contradicts reality and your own legal decisions
Decisions on record: category-based provider disclosure (payment, photo hosting, AI-assisted illustration, storage, email, hosting) and explicit AI-processing disclosure — never imply photos stay in-house.
- `app/privacy/page.tsx:26` says child details/photos are never shared "with anyone **outside our small production team**." False — photos go to a photo host and a third-party AI illustration service; details go to storage/print/email providers.
- The Privacy Policy never mentions AI at all (the order-form photo modal does — the policy must too).
- Retention section says deletion **on request** only; the order form, photo modal, and guarantee page all promise photos are **automatically deleted after the first book is delivered**. The policy should match the stronger promise.
- No governing-law clause anywhere (decision: California). Terms and Privacy also lack the contact email (guarantee page has it).
- Minor: Stripe is named in the policy; decision was category-only.

### 4. The photo-deletion promise has no implementation
"Deleted after your first book is delivered" appears in 3 places (order form hint, consent modal, guarantee page), but there is **no Cloudinary deletion code anywhere**. If you're deleting manually, make it a real recurring ritual (calendar it); otherwise this is an untrue privacy claim about children's photos — the worst kind.

## HIGH — canon/credibility mismatches (the audience you're courting will catch these)

### 5. Homepage hero: "every word decodable at their level"
Overclaims vs your own canon: heart words are by definition not-yet-decodable (that's why they're taught by heart), and Level 4 is deliberately open/authentic — your own reading-approach page says "the decodable scaffolding comes off." A structured-literacy-savvy parent or teacher will spot the contradiction between your hero and your methodology page.
**Fix:** "every word chosen for their level" or "with fully decodable text at the early levels."

### 6. Homepage Level 2 card: "Predictable patterns"
"Predictable text" is the vocabulary of the leveled-reader/three-cueing tradition you explicitly position against (and the L2 prompt itself uses "predictable" too, but that's internal). On the marketing page it reads as the thing you say you're not.
**Fix:** "Repeating sentence patterns" / "patterned, decodable sentences."

### 7. "The exact word list at the back of every book"
Reading-approach (`page.tsx:85`) + homepage FAQ ("even the word list at the back of every book"). By design, "Why These Words?" prints **only the pattern words** (practiced backbone), not every word.
**Fix:** "the practiced-word list at the back of every book."

### 8. Skills matrix vs prose contradiction on the same page
Matrix row: "Short paragraphs & dialogue — introduced: **Confident**." Prose two sections up: "Level 3 — Growing Reader … with **a little dialogue**." The engine allows short (≤3-word) dialogue at L3. Split the matrix row ("Short dialogue" introduced Growing; "Short paragraphs" introduced Confident) or drop dialogue from the L3 prose.

## MEDIUM — consistency & conversion

### 9. Four different level-name sets across the funnel
- reading-approach: Tiny / Beginner / Growing / Confident Reader (canon)
- homepage cards: Brand-new / Very early / Growing / Confident early reader
- order form: brand-new / very early / growing / confident reader
- SEO FAQ: "brand-new reader to confident reader"
Pick one parent-facing set. (Order-form "Level N —" prefixes are load-bearing for `resolveLevel` — keep the prefix, change only the descriptor.)

### 10. Guarantee promise drift — three strengths of the same promise
- Homepage + FAQ + order-form trust row: "redo it for free **or refund you**," including subjective misses ("a theme that didn't land").
- /guarantee: printed books get "when appropriate … a revision, replacement, or another fair solution"; no remorse returns.
- Terms: only defects/our-mistake.
The homepage version is the one customers will hold you to. Either commit to the generous version in /guarantee and Terms, or soften the homepage/order-form wording to "we'll make it right."

### 11. SEO name-page FAQ inaccuracies
- "Add Rush production **at checkout**" — rush is only offered post-purchase on the success page. Say "after checkout" or add add-ons to checkout.
- "written at **exactly** the right reading level" — parent picks the level; drop "exactly."

### 12. Testimonial reads as self-review
One quote, attributed to "A dad in Minnesota" — directly under "Family-run in Minnesota." Ambiguous at best. Use a real customer attribution (first name + state) or hold the section until you have 2–3 real quotes. Social proof is currently the funnel's thinnest trust element.

### 13. Small ops checks
- Guarantee page routes complaints to customlearntoread@gmail.com — confirm that inbox exists and is monitored (it was still to-be-created at the time of the legal pass).
- SEO name pages have no book imagery — they sell on text alone. Reusing the three hero covers would likely lift conversion on your highest-intent landing pages.

---

## Suggested fix order
1. Kill/soften "Preview before it ships" (3 spots) — 10 minutes, removes a false promise.
2. Terms subscription section + success-page "monthly" copy → quarterly.
3. Privacy Policy rewrite: category-based providers, AI disclosure, photo auto-delete retention, governing law (CA), contact email. (One page, all decided already.)
4. Hero "every word decodable" + "predictable patterns" + "exact word list" wording.
5. Skills-matrix dialogue row; level-name unification; guarantee-promise alignment.
6. Decide photo-deletion mechanics (manual ritual vs build it).
