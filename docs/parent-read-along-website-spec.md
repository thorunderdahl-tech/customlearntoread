# Parent Read-Along Lines — website placement spec

_Draft for review. Nothing below is live yet._

**Feature (user-facing name):** Parent Read-Along Lines
**One-line descriptor:** optional grown-up lines for reading comprehension
**Core rule:** OPT-IN ONLY. Default OFF everywhere. Never pre-checked, never bundled, never a
dark pattern. It is free (not a paid add-on) and never changes the words the child reads.

**The single enable point:** one toggle in Step 2 of the order form. Every other surface only
*explains* it (marketing) or *reflects* the choice already made (summary, success, email).

---

## 1. Order form — Step 2 "Reader details" (THE TOGGLE)

**File:** `app/order/OrderForm.tsx` · **Where:** immediately after the "Reading level" `<select>`
(line ~367), before the "Pronouns" field.

**Control:** a single checkbox, unchecked by default. New form field `parent_read_along: boolean`
initialized to `false`.

**Exact copy:**

> ☐ **Add Parent Read-Along Lines** (optional)
> Add a second line on each page for a grown-up to read aloud — richer words and a fuller story —
> while your child reads their own simple line. A lovely way to support reading comprehension.
> Your child's reading stays exactly at their level. [How this works →]

- Checkbox label: **Add Parent Read-Along Lines** (optional)
- Helper text: the two sentences above.
- "[How this works →]" opens the modal in §2.

---

## 2. Order form — "How this works" modal

**File:** `app/order/OrderForm.tsx` · **Pattern:** reuse the existing modal component (same as
"How we use your photos"). Triggered by the link in §1.

**Exact copy:**

> ### Parent Read-Along Lines
>
> Every book is written so your child can read it themselves. Turn this on and each page gets one
> extra line — smaller and in italics — for you to read aloud. It uses richer words and tells a
> fuller story, while your child proudly reads their own simple line.
>
> Reading has two halves: sounding out words, and understanding language. Parent Read-Along Lines
> are a gentle way to support both at once — especially at the earliest levels, where a child's
> own text is necessarily simple. It's completely optional, and it never changes the words your
> child reads.
>
> Inside the book, a short note up front explains which line is which. After that, the two styles
> make it obvious.
>
> [Got it]

---

## 3. Order form — summary sidebar

**File:** `app/order/OrderForm.tsx` · **Where:** the `order-summary-card`, as a new `summary-row`
after the "Level" / "Themes" rows (line ~755). Shown ONLY when the toggle is on.

**Exact copy (conditional):**

> **Read-Along:** Parent lines added

---

## 4. Checkout (Stripe)

**File:** `app/api/checkout/route.ts` / `lib/checkout.ts`. **No paid line item** — the feature is
free. Pass the choice through as order metadata so it reaches the generator and the admin/order
record:

- Include `parent_read_along: true|false` in the checkout payload and Stripe `metadata`.
- No customer-facing change on the Stripe page. (If you ever want it visible there, add it as a
  $0 line item labeled "Parent Read-Along Lines (included)".)

---

## 5. Order success page

**File:** `app/order/success/page.tsx` · **Where:** a new short paragraph after the "What happens
next" section. Shown ONLY if the order included it. (Requires passing the flag to the success
page, e.g. via the confirmation data or a query param.)

**Exact copy (conditional):**

> **Parent Read-Along Lines:** added. Each page will include a small grown-up read-aloud line
> alongside your child's own line, with a short note inside explaining how to read it together.

---

## 6. Confirmation email

**File:** wherever the order confirmation email is composed (checkout webhook / email template).
Add one conditional line in the order-details block. Shown ONLY if on.

**Exact copy (conditional):**

> Parent Read-Along Lines: added

---

## 7. Landing page — "Reading level approach" callout

**File:** `app/page.tsx` · **Where:** inside the `reading-levels` section, a callout directly
below the `levels-grid` (after line ~282), before the section closes.

**Exact copy:**

> **Optional: Parent Read-Along Lines**
> Want to build vocabulary while they learn to sound out words? Add an optional grown-up
> read-aloud line to every page — richer language for you to read together, while your child
> reads their own simple line. Choose it when you order. [How it works →]

- "[How it works →]" links to the FAQ entry (§9) or the explanation page (§8) — recommend the
  explanation page anchor.

---

## 8. Explanation page (recommended: new, for credibility + SEO)

**Recommended file:** `app/reading-approach/page.tsx` (new route `/reading-approach`), or add as a
titled section on the About page. Linked from the toggle modal, the landing callout, and the
footer. This is the credibility-forward home for the fuller rationale.

**Heading:** Parent Read-Along Lines — comprehension support for early readers

**Exact copy:**

> Learning to read has two halves. One is **decoding** — sounding out words, which every book we
> make is carefully built to practice. The other is **language comprehension** — vocabulary,
> ideas, and story. This distinction comes from the *Simple View of Reading*, a long-standing
> framework in reading research: strong reading needs both halves.
>
> Here's the useful part: young children can *understand* far richer language than they can decode
> on their own. **Parent Read-Along Lines** give each page a second line — written for a grown-up
> to read aloud — with bigger words and a fuller story. Your child proudly reads their own simple,
> fully-decodable line; you read yours. They practice sounding words out *and* hear rich language
> at the same time.
>
> We keep it optional, and off by default, because the heart of every book is your child reading
> it themselves. But if you'd like to build vocabulary and a love of stories alongside their
> phonics practice, it's a lovely way to do it — especially for the earliest levels, where a
> child's own text is necessarily simple.

**Claims discipline:** describe the method ("supports comprehension," "built on the Simple View of
Reading"), never the outcome. Do not say "proven to improve comprehension" or similar.

---

## 9. Landing page — FAQ entry

**File:** `app/page.tsx` · **Where:** a new `<details>` in the `faq-list`, best placed right after
the "What if I don't know the reading level?" item (line ~439).

**Exact copy:**

> **What are Parent Read-Along Lines?**
> An optional feature you can turn on when you order — it's off by default and free. Each page
> gets a second line, smaller and in italics, for a grown-up to read aloud, with richer words and
> a fuller story. Your child still reads their own simple line at their level. It's a gentle way
> to support reading comprehension while they build their decoding skills.

---

## 10. About page — optional one-liner

**File:** `app/about/page.tsx` · **Where:** optional, within the "Simple words. Big text." block
(line ~74). Only if you want the mention here.

**Exact copy (optional):**

> Prefer to read together? You can add optional grown-up read-along lines to any book.

---

## Data plumbing checklist (for implementation)

- `OrderForm.tsx`: add `parent_read_along: boolean` to `FormState` (default `false`); render the
  Step 2 toggle + modal; add the conditional summary row; include it in the checkout payload.
- `app/api/checkout/route.ts` + `lib/checkout.ts`: carry `parent_read_along` into Stripe metadata
  and the order record (Airtable).
- Success page + confirmation email: read the flag and show the conditional lines.
- Generator: when the flag is on, produce the `adult_read_aloud` track (already supported in the
  book-spec schema; the validator ignores it) and add the front-of-book key.

## Naming note

Use "Parent Read-Along Lines" consistently across all surfaces. Avoid drifting between
"read-aloud" and "read-along" in labels — pick one (this spec uses "Read-Along Lines") so the
feature reads as one clear thing.
