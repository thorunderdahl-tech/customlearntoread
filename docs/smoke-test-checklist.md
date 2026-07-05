# First post-deploy smoke test

Run this once right after deploying. It exercises everything changed this session in
the order it happens for a real customer. ~15 minutes. Use Stripe **test mode**.

---

## 0. Build

- [ ] Vercel build succeeded (green). If it failed, the old site is still live — safe to fix and re-push.

## 1. Order form — placement + read-along (`/order`)

- [ ] Step 2 shows the reading-level dropdown with sample sentences (e.g. "Level 2 — very early reader · 'Sam runs to the ball.'").
- [ ] Default is "Not sure — we'll match their age."
- [ ] "answer one quick question →" opens the helper; picking an answer shows a live "We'll start [name] at Level N."
- [ ] The "Add Parent Read-Along Lines" checkbox is present and **unchecked** by default.
- [ ] (If testing read-along) check the box; the order summary shows "Read-Along: Parent lines added."

## 2. Checkout → Airtable

- [ ] Complete a test-mode purchase. It reaches Stripe and returns to the success page.
- [ ] If read-along was on, the success page shows the "Parent Read-Along Lines: added" line.
- [ ] New row appears in the **Orders** base with: Child name, Age (as a number), Reading level, and — if you opted in — **Parent read-along = Yes**.
- [ ] You received the owner order email (and, if read-along on, it lists "Parent read-along: Yes").

## 2b. Add-on upsell (immediate post-purchase)

- [ ] The confirmation page shows the "Make it even more special" card with add-ons priced (Digital copy shows only for a **physical** order, not the digital product).
- [ ] Tick "Dedication page message" → a text box appears; the "Add to my order" button stays disabled until you type a message.
- [ ] Select one or two add-ons → button reads "Add to my order · $X" with the correct total → click starts a **second** Stripe checkout (test mode).
- [ ] Complete it. You return to the confirmation page showing "Your add-on is confirmed too."
- [ ] Owner email "Add-on purchased ($X) — …" arrives.
- [ ] The order row's **Add-ons** field lists what was bought (and **Dedication** holds the message, if chosen).
- [ ] Ignoring the card (not selecting anything) leaves the normal confirmation — the core order is unaffected.

## 3. Admin — story generation (`/admin`)

- [ ] Select the test order → **Generate story draft**.
- [ ] The draft returns with `fourQuestions` filled (who/what/why/how) and, if read-along, an `adultLine` on each page.
- [ ] The level badge shows "✓ Level rules pass" (or lists real issues). Any soft **warnings** (cumulative review / practices its level) appear in muted text below — non-blocking.
- [ ] If the order had prior books for this child, the response's plan differs from the last (variety).
- [ ] If the order carries "Parent read-along = Yes", the read-along toggle in the tool is **auto-checked**.

## 4. Admin — art + assemble

- [ ] Generate the character sheet, then the pages. (Physical order = 4K; digital = 2K.)
- [ ] For a **physical** order, if any art is too low-res, **Assemble is blocked** with a clear message (the pre-flight guard). Normal 4K art assembles fine.
- [ ] On the assembled pages: text sits in the bottom band, page numbers are inside the margin.
- [ ] If read-along: each page shows the small italic grey grown-up line under the child line, and a "How to read this book together" key page appears in the front matter.

## 5. Delivery + feedback

- [ ] Deliver the book (digital). Customer email arrives with the flipbook link.
- [ ] The email ends with "how did the reading level feel?" — **Too easy · Just right · Too hard** links.
- [ ] Click one. You land on a friendly thank-you page, and you (owner) get a "Reading feedback: …" email with a level suggestion.
- [ ] The order row now shows **Reading feedback** set. Re-open that order in the create tool → the "Last book feedback" note appears above the level control.

## 6. Save persists (the fix)

- [ ] After generating, click **Save** in the create tool. The order row now has a **Story draft** value (JSON). (Before this session it was silently empty.)

## Notes

- Subscription-cycle record creation only fires on a real monthly renewal, so it can't be
  tested in one sitting — verify it after your first Book Club renewal (a new "Paid" order
  row should appear tagged with the invoice id).
- Manual: convert the Airtable "Shipping address" field to plain text in the UI when convenient.
