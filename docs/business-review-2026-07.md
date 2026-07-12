# CustomLearnToRead — Business & Financial Review

*July 3, 2026. Costs verified against current (2026) published pricing; sources at bottom. All figures USD.*

## 1. What the business is

Direct-to-consumer personalized learn-to-read books (BOB-Books-style, child is the reader), sold on a self-hosted Next.js/Stripe store. Production is a semi-automated pipeline: LLM story generation with deterministic reading-level QA → Gemini image generation with vision QA → human (admin) review/approval → PDF assembly → print-on-demand fulfillment. No inventory, no Etsy fees, orders by email, Airtable for order state and abandoned-cart recovery.

**Catalog:** Digital $19 · Paperback $34 · Hardcover $54 · Paperback set of 3 $89 · Hardcover set of 3 $129 · Monthly club $24/mo. Add-ons: Rush +$15, 2nd character +$12. Free US shipping on physical products.

## 2. Input costs (per book, current pricing)

| Input | Cost | Notes |
|---|---|---|
| AI art (Gemini 3 Pro Image, 2K) | $3.35–4.70 | $0.134/image standard; ~25–35 generations/book (cover, character sheet, ~20 pages, retries). **Batch API halves this to ~$1.70–2.35** but the current pipeline is interactive |
| Story LLM + vision QA | ~$0.05–0.15 | Negligible (Flash-class models) |
| Print — paperback, 24pg premium color | ~$3.60 | KDP flat rate for 24–40pg premium color; Lulu similar ($4–5) |
| Print — hardcover, casewrap ~24–32pg | ~$11–13 | **Lulu only — KDP hardcover requires ≥75 pages.** Premium color casewrap |
| Shipping (single book, US) | $4.50–5.50 | POD mail; ~$1.50–2 per additional book in same shipment |
| Stripe | 2.9% + $0.30 | $1.29 on a $34 order |
| **Labor (your time)** | **$25–45** | **1.5 hr/book × $25–30/hr. This dwarfs everything else — see §4** |

**Overhead (monthly):** Vercel Pro $20, Airtable $20, Resend $0 (free tier to 3k emails), domain ~$1.50 amortized, Gemini/Stripe dashboards $0 → **~$45/mo at low volume**; ~$400/mo at scale (accounting, insurance, better tooling, email volume).

## 3. Unit economics

### Cash margin (excluding your labor)

| Product | Price | Cash COGS | Cash margin | % |
|---|---|---|---|---|
| Digital | $19 | $4.85 | $14.15 | 75% |
| Paperback single | $34 | $13.39 | $20.61 | 61% |
| Hardcover single | $54 | $23.37 | $30.63 | 57% |
| Paperback set ×3 | $89 | $32.18 | $56.82 | 64% |
| Hardcover set ×3 | $129 | $60.04 | $68.96 | 53% |
| Monthly club | $24/mo | $13.10 | $10.90 | 45% |

Blended (est. mix): **AOV ~$56, cash margin ~$33.56/order (60%), 1.7 books/order.**

### Fully loaded (labor at 1.5 hr/book, $30/hr)

Every product is **negative**: Digital −$30.85, Paperback −$24.39, Hardcover −$14.37, Paperback set −$48.18, Hardcover set −$36.04, Subscription −$19.10.

**The breakeven number: at the blended mix, labor must cost ≤ $19.74/book — about 47 minutes at $25/hr.** At your current 1–2 hours/book, the business only "works" because your time is unpriced. Cutting hands-on time per book is the single highest-leverage financial move, worth more than any price increase or print-cost negotiation.

## 4. Scenarios

| Scenario | Orders/mo | Labor/book | Revenue | Monthly profit | Margin |
|---|---|---|---|---|---|
| Low volume, founder time free | 10 | (unpriced) | $560 | $291 | 52% |
| Low volume, labor costed | 10 | 1.5 hr @$30 | $560 | −$474 | −85% |
| Mid | 50 | 45 min @$25 | $2,800 | −$66 | ~0% |
| **Scale, pipeline improved** | **200** | **20 min @$25** | **$11,200** | **$3,481** | **31%** |
| Scale, pipeline NOT improved | 200 | 1.5 hr @$25 | $11,200 | −$6,438 | −57% |
| Larger scale | 500 | 15 min @$25 | $28,000 | $10,267 | 37% |

Two things fall out of this table. First, scale without automation makes losses bigger, not smaller — volume is not the fix. Second, once labor is ~20 min/book, the business clears 30%+ net at 200 orders/mo, which at $56 AOV is ~7 orders/day. 200 orders/mo at 20 min/book is still ~28 hr/week of production work — roughly the ceiling for one person alongside everything else.

**Note: no customer-acquisition cost is in this model.** SEO name pages and word-of-mouth are free; if growth requires paid ads, personalized-book CAC typically runs $15–40/order, which consumes half to all of the $33 blended cash margin. Profitability at scale likely depends on organic channels working.

## 5. Path to profitable — priorities

1. **Cut labor to ≤20 min/book.** Batch-generate overnight, present the admin an approve/reject gallery instead of interactive generation, auto-retry failed QA before human review, template the front/back matter. Target: human touches the book twice (approve story, approve art).
2. **Fix print-blocking defects before selling more softcovers** (from GENERATOR-REVIEW.md): no bleed, 293 DPI, ~180 DPI effective art resolution, no wraparound cover/spine, odd page counts. These risk printer rejections and refunds/reprints — a $34 order refunded after printing costs ~$22 cash plus the labor.
3. **Use the Gemini Batch API** ($0.067 vs $0.134/image) — halves AI cost to ~$2/book and pairs naturally with the overnight-queue workflow. Rush add-on ($15) covers keeping the interactive path for those orders.
4. **Reprice or drop weak SKUs.** The $24 subscription has the worst margin (45% cash, $10.90) with the same production burden as a $34 sale — raise to $29 (still cheapest per-book price) or make it paperback-only with simpler themes. Digital at $19 is your best margin (75%) and zero print/ship risk — push it harder in the funnel.
5. **Raise hardcover price or renegotiate.** Hardcover must come from Lulu at ~$11–13/unit; the $54 single and especially $129 set (53%) carry the highest COGS and highest defect exposure. $59 / $139 is well within personalized-book market norms (Wonderbly $34.99+ softcover, $44.99+ hardcover before shipping).

## 6. Concerns — process and cost structure

**Process**
- **Single point of failure: you.** Every book requires admin approval; illness or vacation halts fulfillment. Rush orders promise queue-jumping you must personally honor.
- **Print pipeline is not yet printer-safe** (§5.2). Selling hardcover sets before the cover-wrap/spine generator exists means hand-building each one.
- **Hardcover fulfillment dependency on one vendor** (Lulu, due to KDP's 75-page floor). A Lulu price increase (they reprice annually) hits your two highest-priced SKUs directly.
- **Photo handling by email reply** is friction-heavy and a consent/privacy touchpoint (photo-consent UX already flagged in legal review); it also strands order data outside Airtable.
- **No refund/reprint reserve.** POD errors, address issues, and "art doesn't look like my kid" complaints are inevitable; budget 3–5% of revenue.
- **Model dependency:** art quality and cost depend on a single Gemini model. 2026-07-12: default moved off the preview alias to stable `gemini-3-pro-image` (Nano Banana Pro), removing the deprecation risk; `gemini-3.1-flash-image` remains the untested cheaper fallback (`ART_MODEL` override) — re-test style before relying on it.

**Cost structure**
- **Labor is 65–80% of fully-loaded unit cost.** Everything else is rounding error by comparison. (§3–4)
- **Free shipping is baked into prices** — fine for singles, but shipping is per-shipment, so sets are actually more shipping-efficient; the pricing already reflects this correctly.
- **AI retry costs are unbounded.** QA failures trigger regenerations with no per-book cap; a problem order can quietly cost 2–3× in image spend. Add a generation budget per book (~40 images) with an alert.
- **Subscription churn math:** at $10.90 cash margin/month, a subscriber must stay ~2 months just to match one paperback sale — while costing production labor every month. Without churn data, the club may be a discount program for your best customers rather than recurring revenue.
- **Stripe's $0.30 fixed fee** makes the $19 digital slightly less attractive than it looks at low prices — immaterial now, worth remembering if you ever test a cheaper digital tier.

## 7. Bottom line

Cash unit economics are healthy (53–75% margins) and overhead is trivially low (~$45/mo). The business is structurally sound **except** for one number: hands-on production time. At 1–2 hr/book, this is a job that pays under minimum wage past ~15 orders/mo; at ~20 min/book it's a 30–37% net-margin business that clears ~$3.5k/mo at 200 orders and ~$10k/mo at 500 — provided growth comes from organic channels, since paid CAC would consume most of the blended margin. Spend engineering effort on production automation and print-file correctness before spending anything on demand generation.

---

## 8. Update — July 11, 2026 (post-automation)

*What changed since §1–7 were written, and what the numbers look like now.*

### 8a. The labor fix shipped

The unattended generation queue (`docs/generation-queue.md`) + review gallery landed. Generation now runs server-side on a cron; the human role is review-and-deliver. Realistic hands-on time: **~15–20 min/book** (clean book: skim gallery, assemble, deliver ≈ 10 min; flagged book: + a page redo or two). That is §4's "Scale, pipeline improved" row — the scenario this doc said the business depends on **now exists in code**.

Fully-loaded margins at 20 min/book @ $30/hr ($10 labor/book; sets = 3 books = $30):

| Product | Price | Cash margin (§3) | Fully loaded NOW | Was (1.5 hr) |
|---|---|---|---|---|
| Digital | $19 | $14.15 | **+$4.15** | −$30.85 |
| Paperback single | $34 | $20.61 | **+$10.61** | −$24.39 |
| Hardcover single | $54 | $30.63 | **+$20.63** | −$14.37 |
| Paperback set ×3 | $89 | $56.82 | **+$26.82** | −$48.18 |
| Hardcover set ×3 | $129 | $68.96 | **+$38.96** | −$36.04 |
| Monthly club | $24/mo | $10.90 | **+$0.90** | −$19.10 |

Every SKU is now positive on a fully-loaded basis **except the club, which is barely breakeven** — §5.4's advice (raise to $29 or simplify) is now the top pricing action.

### 8b. Print-cost model changed: Cornerstone replaces KDP for softcover

Softcover now routes to **Cornerstone Copy Center** (local, saddle-stitch booklet) instead of KDP. Two consequences the old model didn't have:

1. **Unknown unit cost.** §2 assumed KDP's $3.60 flat. Cornerstone's booklet price for a ~24-page 5.5×8.5 full-color booklet is not published per-unit — **get a written quote** (and ask about 5/10/25-copy price breaks; local shops often beat POD at small batch). Every $1 above $3.60 comes straight off the paperback's $20.61 cash margin.
2. **Fulfillment moved in-house.** KDP shipped to the customer; Cornerstone hands YOU booklets. Add per-order: mailer + label ~$1–2, postage ~$4–6 (USPS Media Mail doesn't apply to blank-ish booklets — assume First-Class/Ground Advantage), and ~10 min of packing/dropoff labor (~$5). Net: **softcover COGS likely rises $3–8/unit vs the KDP model** unless Cornerstone's print price undercuts KDP meaningfully. Counterweights: local pickup = faster turnaround (Rush add-on gets real), quality control in your hands before shipping, no POD trim-quality lottery.

**Action:** after the first Cornerstone proof, fill in the real numbers here. If softcover fully-loaded margin lands under ~$8, raise paperback to $39 (Wonderbly-range) or restore a POD path for non-rush orders.

Hardcover stays Lulu (§2 estimate ~$11–13 — still needs calculator verification). Digital economics unchanged (best margin, zero fulfillment risk — keep pushing it in the funnel).

### 8c. Remaining cost levers, in order

1. **Gemini Batch API** (§5.3) — still open; pairs perfectly with the now-async queue. ~−$1.70–2.35/book at current volume mix. This is the last engineering item with a direct per-unit payoff.
2. **Image cap is live** (40/book, `PIPELINE_IMAGE_CAP`) — §6's "unbounded retry" concern is closed; the "AI images" field now measures per-book spend, so §2's estimate can be replaced with actuals after ~20 queued books.
3. **Club repricing** — see 8a.

### 8d. Risk register updates

- **SPOF (you)** — reduced, not gone: generation no longer needs you, but review/delivery/shipping (now MORE shipping, per 8b) does. The morning digest is the monitoring layer; it sends daily even when quiet, so silence = something's broken.
- **Model dependency** (§6) — unchanged and still the top external risk. `ART_MODEL` env override exists; actually test a fallback model's style before the preview model is deprecated.
- **New:** Cornerstone is a single local vendor with business-hours turnaround — a shop closure or backlog stalls all softcovers. Keep the Lulu path viable as a fallback for softcover (their saddle-stitch/perfect-bound options) even if unused.

### 8e. Bottom line, revised

The §7 conclusion ("spend engineering effort on automation before demand generation") has been executed. At today's state: **~$56 AOV, ~60% cash margin, every SKU fully-loaded-positive at 20 min/book.** The order of operations now flips to: (1) verify Cornerstone + Lulu real unit costs with proofs, (2) reprice club (and paperback if 8b lands badly), (3) Batch API, (4) then — and only then — demand generation, still organic-first since paid CAC ($15–40) eats most of the blended margin.

### Sources
- Gemini 3 Pro Image pricing ($0.134/image standard, $0.067 batch): [Google AI pricing](https://ai.google.dev/gemini-api/docs/pricing), [aifreeapi calculator](https://www.aifreeapi.com/en/posts/gemini-3-pro-image-preview-pricing-calculator)
- KDP premium color 24–40pg flat $3.60; >40pg $1.00+$0.065/pg: [KDP paperback cost](https://kdp.amazon.com/en_US/help/topic/G201834340), [theauthorcentral guide](https://theauthorcentral.com/blog/kdp-paperback-printing-cost-guide/)
- KDP hardcover 75-page minimum: [KDP page limits](https://kdpprintcover.com/blog/minimum-maximum-page-counts-kdp/)
- KDP author-copy shipping $3–5 first book: [authorimprints](https://www.authorimprints.com/amazon-kdp-author-copies/)
- Lulu pricing structure & 2026 annual update: [Lulu pricing](https://www.lulu.com/pricing), [2026 update](https://help.lulu.com/en/support/solutions/articles/64000271603-annual-pricing-update)
- POD cost comparison (KDP/Lulu/IngramSpark 2026): [books.by comparison](https://books.by/guides/print-cost-comparison), [IngramSpark Feb 2026 price sheet](https://myaccount.ingramspark.com/documents/IngramSparkPriceSheet.pdf)
- Internal: `lib/products.ts` (catalog), `docs/print-spec.md`, `GENERATOR-REVIEW.md` (pipeline defects), README.md
- Hardcover print cost (~$11–13) is an estimate from Lulu/Ingram premium-color casewrap rates — **verify with the Lulu calculator before repricing hardcovers.**
