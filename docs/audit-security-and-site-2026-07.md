# Security & Customer-Site Audit — July 11, 2026

Two audits: the money/security path (checkout, webhook, admin auth, public endpoints, PII) and the customer-facing site (funnel, trust, claim accuracy). This doc records what was found, **what I already fixed**, and the **decisions left for you**.

---

## Part 1 — Security & money path

### The good news (no action)
- **Prices are server-authoritative.** The client sends only a product id / add-on ids; amounts come from the server catalog (`lib/products.ts`) and Stripe Price IDs. A customer cannot set their own price. (`app/api/checkout/route.ts`, `checkout-addon/route.ts`)
- **Stripe webhook signature is verified** with the signing secret over the raw body — forged events are rejected. (`app/api/webhook/route.ts:55-68`)
- **Admin auth is solid**: HMAC-signed, httpOnly, secure cookie; timing-safe password/signature comparison; 5-attempts/15-min throttle. (`lib/auth.ts`, `app/api/admin/auth/route.ts`)
- **Crons fail closed** on `CRON_SECRET`. **No secret is exposed under `NEXT_PUBLIC_`.**

### Fixed in this pass
1. **Feedback link was enumerable/tamperable** (`/api/feedback`): anyone guessing an order id could overwrite its "Reading feedback" field, spam the owner, and read the child's name back in the response. → The delivery email now **signs the order id** (`signTag`), the endpoint **requires a valid signature** before touching Airtable or emailing, and the response no longer reflects any per-order data. (`lib/auth.ts`, `app/api/admin/deliver/route.ts`, `app/api/feedback/route.ts`)
2. **Resume link was enumerable** (`/api/resume`): a valid order id spun up a Stripe checkout session prefilled with the victim's email. → Recovery email now **signs the id**; the endpoint **rejects unsigned/forged links**. (`app/api/cron/abandoned/route.ts`, `app/api/resume/route.ts`)
3. **PII in logs**: the webhook logged the full order metadata (names, email, address) on the "email not configured" path, and checkout logged the raw error. → Both now log only non-PII identifiers. (`app/api/webhook/route.ts:188`, `app/api/checkout/route.ts:198`)

> Migration note: recovery/delivery emails already sent before this deploy contain **unsigned** links, which will now fail closed (resume → redirect to /order; feedback → generic thank-you, no record update). Acceptable degradation; re-sends will carry signed links.

### Decisions left for you (security)

**S1 — Cloudinary unsigned upload preset (MED, config not code).** Reference photos upload straight from the browser to Cloudinary using a public cloud name + **unsigned** preset shipped in the client bundle (`app/order/OrderForm.tsx:204-219`). Anyone can read those two values and upload arbitrary images to your Cloudinary account; the size/type checks are client-side only. *Fix in the Cloudinary dashboard, not the repo:* restrict the preset (allowed formats, max size, a locked folder, moderation/rate limits), or move uploads behind a signed server route. **Recommend: tighten the preset now** — it's a few dashboard settings.

**S2 — Webhook idempotency is best-effort (MED).** The new-order branch skips if the order is already `Paid`, but: the add-on branch has **no** idempotency (a Stripe retry re-merges add-ons and re-emails), there's no dedupe on Stripe **event id**, and two near-simultaneous deliveries can race. At low volume this is rare, but a Stripe retry storm or Airtable hiccup can double-send. *Proper fix:* record processed `event.id`s (an Airtable field or a tiny KV) and no-op on repeats; make the add-on branch check a recorded session id. **Recommend: do this before scaling volume**, not urgent at current order counts. I can implement it if you want the Airtable-field approach.

**S3 — Admin auth hardening (LOW–MED).** Single owner password, no 2FA; the session secret falls back to the password if `ADMIN_SESSION_SECRET` is unset (`lib/auth.ts:75`); the login throttle is per-warm-instance (weak against distributed attempts). **Recommend: set a dedicated random `ADMIN_SESSION_SECRET` env var now** (one line, removes the fallback coupling). 2FA is overkill for a one-owner shop today.

**S4 — Book links are ~40-bit capability URLs, no expiry (ACCEPTABLE).** Fine for an unlisted share link parents forward to grandparents; noted only so you know it's a deliberate trade-off. No action unless a book ever holds higher-sensitivity data.

**S5 — Add-on `orderId` is client-supplied (LOW).** A caller who knows another order's record id could attach *paid* add-ons to it (data-integrity, not theft). Airtable ids are hard to guess. Low priority; S2's work would be the place to also sign this.

---

## Part 2 — Customer-facing site

### Fixed in this pass
1. **Stale "monthly" subscription copy** — Terms and the order-success page still described a *monthly* club; the product is **quarterly** everywhere else. Corrected both (Terms is legally load-bearing). (`app/terms/page.tsx:25`, `app/order/success/page.tsx:42`)
2. **Level names were inconsistent across three surfaces** — home said "Brand-new / Very early reader," the order form a third variant, `/reading-approach` the canonical "Tiny/Beginner/Growing/Confident." → Home and order form now lead with the **canonical names** (order form keeps the friendly descriptor after them). (`app/page.tsx:269`, `app/order/OrderForm.tsx:51`)
3. **"Rush at checkout"** promised on the SEO name pages, but rush is only offered *post-purchase*. → Copy now says "offered right after you order." (`app/personalized-book-for/[name]/page.tsx:69`)

### Decisions left for you (site)

**C1 — Age→level mapping disagrees with the rubric (MED).** The order form's quiz helper (`OrderForm.tsx:70-77`) maps **age 5 → Tiny** and **age 8 → Confident**, but the canonical `resolveLevel` (`lib/leveling.ts`) maps 5→Beginner and 8→Growing. So the level a parent is *shown* in the quiz can differ from what a "Not sure — match their age" order actually produces. The downward skew is intentional ("confidence-first," per the code comment) — but **age 8 skewing *up* to Confident contradicts that philosophy** and is the one to reconcile. *Your call:* keep the confidence-first skew but fix age 8, or align the helper to the canonical bands. I didn't change it because it changes what level real orders get — a product decision.

**C2 — "Refund" promise vs the guarantee fine print (MED, trust).** Home and the order form say "refund you / refund if it's not right"; the guarantee page only promises **replacement/revision** for printed books ("another fair solution… when appropriate") and says personalized books can't be returned. For a $34–139 purchase that gap is a classic post-purchase dispute. *Your call:* either soften the home/order wording to "we'll make it right (revision or replacement)," or firm up the guarantee page to actually offer refunds. This is a policy decision + legal wording, so I left it.

**C3 — Privacy Policy omits AI / third-party photo processing (MED, trust + especially sensitive because children).** The order-form modal discloses AI use of photos, but the Privacy Policy says photos are only shared "within our small production team" — no mention that photos go to Cloudinary and an image model. *Recommend adding a sentence.* I can draft it, but privacy language is a legal call you should sign off on.

**C4 — Photo-retention promise vs the subscription (MED).** "Photos deleted after your first book is delivered" is stated as absolute, but the Quarterly Club needs to keep producing likeness-accurate books each season. Reconcile the promise with the workflow (e.g. "kept for the life of an active subscription, deleted on cancellation").

**C5 — Thin social proof (conversion).** One anonymous testimonial + two commented-out placeholders (`app/page.tsx:361-389`). Fill these with real quotes before spending on paid traffic — a $139 set needs more than one line.

**C6 — Pricing display hides SKUs (conversion, minor).** The home pricing grid omits the **Single Hardcover ($59)** entirely and buries **Single Paperback ($34)** in a text link, so the cheapest physical option shown is the $89 set. Consider surfacing the single paperback as an entry point.

---

## Suggested order of operations
1. **Now, one-liners:** set `ADMIN_SESSION_SECRET` (S3); tighten the Cloudinary preset (S1). Both are dashboard/env, no deploy.
2. **This deploy (done):** the signing + PII-log + copy fixes above.
3. **Your calls:** C1 (age 8), C2 (refund wording), C3 (privacy sentence — I can draft), C4 (retention wording).
4. **Before scaling volume/ads:** S2 (webhook idempotency), C5 (testimonials).
