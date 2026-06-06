# Finish-up checklist — revenue features

The order bumps, abandoned-order recovery, and SEO landing pages are deployed.
The items below need your own account logins, so they couldn't be done
automatically. Total time ≈ 7 minutes. Check each box as you go.

Status legend: ☐ = to do · ☑ = done

---

## 1. Airtable — add 2 columns  ·  ~1 min
*Enables add-on logging + abandoned-order recovery.*

In your **Orders** table, add two **Single line text** fields, named exactly:

- ☐ `Add-ons`
- ☐ `Recovery sent`

(Until these exist, orders still save fine — the new fields are just skipped.)

## 2. Vercel — add 3 env vars, then redeploy  ·  ~2 min
*Turns on the automatic abandoned-cart recovery emails.*

Project → **Settings → Environment Variables** (Production), then redeploy:

```
CRON_SECRET=k7Qx2mP9vR4tL8wZ3nB6yH1cF5jD0sA
RECOVERY_PROMO_CODE=COMEBACK10
RECOVERY_DISCOUNT_LABEL=10%
```

- ☐ Added all three
- ☐ Redeployed

The hourly recovery cron stays **dormant until `CRON_SECRET` is set**, so there
is no risk of stray emails before you're ready.

## 3. Stripe — create the live discount code  ·  ~1 min
*This is the offer the recovery email promises.*

A 10%-off coupon was created in the **test** account during setup, so it must be
recreated in **Live mode**:

Dashboard → toggle **Live mode** → **Product catalog → Coupons → Create coupon**
→ 10% off, Duration: **Once** → Save → open the coupon → **Add promotion code**
→ enter `COMEBACK10`.

- ☐ Live coupon + `COMEBACK10` promotion code created

## 4. Google Search Console — submit sitemap  ·  ~3 min
*Speeds up Google indexing of the new SEO landing pages.*

[search.google.com/search-console](https://search.google.com/search-console) →
add & verify your domain → **Sitemaps** → submit `sitemap.xml`.

- ☐ Sitemap submitted

---

## What's already live (no action needed)
- Storefront, order bumps (Rush +$15, Add a 2nd character +$12)
- All `/personalized-book-for/[name]` SEO landing pages + the index hub
- Add-on details flow into the owner order email automatically

## Reference — what each feature does
- **Order bumps:** optional paid add-ons on the final order step, priced inline
  at checkout (no extra Stripe Price IDs). Edit them in `lib/products.ts`.
- **Abandoned-order recovery:** hourly cron (`vercel.json` → `/api/cron/abandoned`)
  emails unpaid orders a one-click `/api/resume` link that rebuilds the Stripe
  checkout from the saved order, plus the discount code.
- **SEO landing pages:** a page per popular name (`lib/names.ts`), any name on
  demand, all in the sitemap, funneling to the order form with the name prefilled.
