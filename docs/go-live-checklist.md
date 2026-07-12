# Go-Live Checklist — Pricing + Quarterly Club + Spend Logging

*Do these in order. Steps 1–2 are in Stripe, step 3 is Airtable, step 4 deploys the code.*

## ✅ Stripe prices already created (live mode, July 5 2026)
These were created for you in the live Stripe dashboard. Paste the IDs into the matching Vercel environment variables (Vercel → Project → Settings → Environment Variables), then redeploy:

```
STRIPE_PRICE_SUBSCRIPTION_QUARTERLY = price_1Tq1FOPox47760AESOGoB69p   # Quarterly Reading Club, $69 every 3 months
STRIPE_PRICE_HARDCOVER_SINGLE        = price_1Tq1GcPox47760AErVLhGekj   # Single Hardcover, $59 one-off
STRIPE_PRICE_HARDCOVER_SET           = price_1Tq1I2Pox47760AEhtTMjxHh   # Hardcover Set of 3, $139 one-off
```

Notes:
- The old $54 / $129 hardcover prices still exist and remain "Default" in Stripe — harmless, because the app uses the specific price IDs above, not Stripe's default. Archive the old prices later if you want a clean catalog.
- The old `STRIPE_PRICE_SUBSCRIPTION_MONTHLY` var is no longer read; the "Monthly Book Club" product is left intact so existing monthly subscribers keep billing until they cancel.
- The $89 first-season charge is added in code, so no separate Stripe price is needed for it.

---

## What changed in the code (already done)
- Hardcover single **$54 → $59**, hardcover set **$129 → $139** (`lib/products.ts`).
- Monthly club **replaced** by the **Quarterly Reading Club**: $89 first season, then $69/season, 3 paperbacks per shipment. First-season surcharge is handled in code (`firstInvoiceSurchargeCents`), so Stripe only needs one recurring price.
- Landing page, order form, receipt emails, terms, and success page updated to match.
- **Phase 0 spend logging:** every generated image bumps an `AI images` counter on the order in Airtable (best-effort; a no-op until you add the column in step 3).

---

## 1. Update the two hardcover prices in Stripe
Stripe Dashboard → **Product catalog**.
- Open **Single Hardcover** → its price → set to **$59.00** (or add a new $59 price, set it active/default, and copy its `price_...` ID into `STRIPE_PRICE_HARDCOVER_SINGLE`).
- Open **Hardcover Set of 3** → set to **$139.00** (same approach; env key `STRIPE_PRICE_HARDCOVER_SET`).

> Tip: Stripe prices are immutable — editing "the price" actually creates a new price object. Easiest path: create the new price, mark it default, copy the new `price_...` ID into the matching env var in Vercel. If you kept the amounts driven only by `lib/products.ts` display and the same Stripe price, update both so they don't disagree.

## 2. Create the Quarterly Reading Club recurring price
Stripe Dashboard → **Product catalog → Add product** (or reuse the old subscription product).
- Name: **Quarterly Reading Club**
- Price: **$69.00**, **Recurring**, billing period **Monthly** with **interval count = 3** (i.e. "every 3 months"). If your Stripe UI offers "Quarterly" directly, use that.
- Save, open the price, copy the **`price_...` ID**.
- In **Vercel → Project → Settings → Environment Variables**, set:
  ```
  STRIPE_PRICE_SUBSCRIPTION_QUARTERLY = price_...
  ```
- You do **not** need a separate price for the $89 first season — the code adds a one-time $20 line item to the first invoice automatically ($69 + $20 = $89 season one, $69 thereafter).
- Also confirm `STRIPE_PRICE_HARDCOVER_SINGLE` exists in Vercel (it was referenced in code but missing from `.env.example` before — now added).

> The old `STRIPE_PRICE_SUBSCRIPTION_MONTHLY` env var is no longer read and can be removed. Existing monthly subscribers keep billing on their old Stripe subscription until they cancel — this change only affects new signups.

## 3. Add the Airtable column for spend logging
In your Orders table, add a **Number** field named exactly **`AI images`** (integer, default 0).
- Until this exists, the counter write is silently dropped (safe — nothing breaks), so generation keeps working; you just won't see counts.
- Once added, each book accumulates its image count. Multiply by the current per-image rate (~$0.134 standard / ~$0.067 batch) to see true per-book art cost. Optional: add a formula field `AI images * 0.134` for a live cost estimate.

## 4. Deploy
1. Open **GitHub Desktop** → review the changed files (products, checkout, resume, webhook, page, OrderForm, terms, success, SiteHeader, airtable, art route, create client, .env.example, docs).
2. **Run `npm run build` locally first** if you can — this repo's synced dependencies can be incomplete elsewhere; a clean local build confirms it compiles before Vercel does.
3. Commit (suggested message below) → **Push origin**. Vercel auto-deploys from the connected branch.
4. After deploy, do a quick smoke test on the live site: open the order page, pick the Quarterly Reading Club, and start checkout — confirm Stripe shows **$89.00 due today** and the subscription line reads **$69.00 every 3 months**. Cancel the test before paying (or use a Stripe test key first).

Suggested commit message:
```
Reprice hardcovers, replace monthly club with quarterly reading club, add per-book AI spend logging

- Hardcover single $54->$59, set $129->$139
- Quarterly Reading Club: $89 first season then $69/qtr (first-invoice surcharge in code)
- Log AI image count per order to Airtable (Phase 0 of automation plan)
```

---

## Verify after go-live
- [ ] Quarterly checkout shows $89 first / $69 recurring
- [ ] Hardcover prices read $59 / $139 on the site and in Stripe
- [ ] A test order increments `AI images` in Airtable (after step 3)
- [ ] Receipt email says "Quarterly Reading Club," not "Monthly"

## Still open (not in this change)
- Batch API (Phase 1) and the overnight generation queue (Phase 2) — the real labor fix — are speced in `docs/automation-build-plan.md`. Batch API is best built **with** the queue, not before it, so it's deliberately not in this deploy.
