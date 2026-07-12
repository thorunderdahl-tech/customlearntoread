# CustomLearnToRead — Project & Brand Charter

_A portable context document. Paste this into any LLM to brief it on what CustomLearnToRead is, how it thinks, how it talks, and the rules it must never break._
_Last updated: 2026-07-05_

---

## 0. How to use this document

You are being briefed on CustomLearnToRead. Treat every rule in the **Claims discipline** (§7) and **Legal & policy guardrails** (§8) sections as hard constraints — they exist to keep the brand credible with educators and safe from the overclaiming litigation that has hit competitors. When you help with copy, product, or strategy, lead with pedagogy and honesty, not marketing gloss.

---

## 1. What the company is

CustomLearnToRead sells **personalized decodable readers** — learn-to-read books that star the individual child and are engineered so the child can actually decode the text using the phonics patterns they are currently learning.

The one-liner:

> **Personalized decodable readers built on a structured, systematic phonics scope-and-sequence — so children practice reading the exact patterns they're learning, in stories about themselves.**

That sentence leads with the pedagogy (_decodable_, _systematic phonics_, _scope-and-sequence_), not the personalization. That ordering is deliberate and should be preserved in most contexts.

**Legal business name:** Custom Learn to Read
**Governing law:** State of California, USA
**Customer contact email:** customlearntoread@gmail.com

---

## 2. The business model

A self-hosted Next.js 14 + Stripe storefront (replacing an earlier Etsy listing). It sells personalized books as one-time orders or a monthly subscription. Orders arrive to the owner as a formatted email — intentionally no admin dashboard, no inventory system, no marketplace fees.

Product catalog:

| Product | Price | Type |
|---|---|---|
| Digital PDF | $19 | One-time |
| Single Paperback | $34 | One-time |
| Paperback Set of 3 | $89 | One-time |
| Hardcover Set of 3 | $129 | One-time |
| Monthly Book Club | $24/month | Recurring |

Revenue mechanics also include checkout add-ons (rush production, 2nd character), abandoned-order recovery emails with a discount code, and programmatic SEO landing pages ("A book where Emma is the hero") targeting "personalized book for &lt;name&gt;" searches.

---

## 3. The strategic reframe

The company is shifting **from a fixed catalog of books to a rule-driven story generation system** — separating the educational engine from the story content so one set of rules can produce thousands of personalized, level-correct books.

Two foundational corrections underpin this:

1. **The educational engine is phonics-first, not sight-word-first.** An earlier Dolch/whole-word framing was rejected because it rests on whole-word memorization, which the research consensus has moved away from.
2. **Naming conventions ("Adventures" vs "Stories") don't matter.** What determines whether the system scales is the reading engine and the validation layer — not branding words.

---

## 4. The pedagogy (the core of the brand)

**Hybrid phonics-first + "heart words."** A structured, systematic, explicit phonics scope-and-sequence is the spine; a small, explicitly-tracked set of high-frequency irregular words ("heart words") is layered on top.

Key principles:

- **Systematic explicit phonics is the settled consensus.** The discredited practice is **three-cueing** — teaching a child to _identify_ a word by guessing from picture/context instead of decoding it.
- **Illustrations may correspond, but never create dependency.** Pictures can depict, enrich, and let a child _confirm_ a decoded word — but no in-level word's identification may _depend_ on the illustration. Operational test: _cover the pictures; a child at level should still be able to read every in-level word._ The anti-pattern is the predictable book ("I see a ⬜, I see a ⬜") where the noun is only gettable from the picture.
- **Most "sight words" are actually decodable** (_at, him, up, can, did, not, will…_). Only genuinely irregular words (_the, of, was, said, are, you, they…_) are taught as **heart words** — decode the regular part, memorize only the irregular letter(s) "by heart."
- **Personalization is the antidote to sterility.** A constrained sentence about the child and their favorite dinosaur is engaging in a way a generic decodable ("Nat the cat sat on the mat") is not. Text loosens toward natural language as decoding is mastered.

### The word-eligibility rule (the heart of the engine)

> A word may appear at Level N if **any** of the following is true:
> 1. It is **decodable** using phonics patterns taught by Level N; **or**
> 2. It is a **heart word** introduced at or before Level N; **or**
> 3. It is an **allowed personalization/theme token**, subject to that layer's caps.

Everything else — levels, skills matrix, validator — is a formal expression of this one rule.

---

## 5. Leveling

**Ten custom reading levels**, each defined by phonics patterns + heart words + sentence rules, and cross-walked to an approximate grade/age band so parents and teachers can place a child quickly.

Deliberately **not** branded as:

- **Fountas & Pinnell** — built on the discredited three-cueing model and subject to a December 2024 class-action over deceptive "research-backed" marketing. Anchoring to it imports liability and looks dated.
- **Official Lexile** — proprietary to MetaMetrics, requires a signed license. The brand may say "roughly equivalent to a [grade] reading level," never "Lexile 300L certified."

Honest phrasing: _"Our ten reading levels are defined by an explicit phonics scope-and-sequence and a tracked set of high-frequency words. Each level is cross-walked to an approximate grade band."_

---

## 6. The system architecture (7 layers)

| # | Layer | What it does |
|---|-------|---------------|
| 1 | **Reading System** | Phonics scope-and-sequence, heart words, level constraints, skills matrix |
| 2 | **Story Templates** | Reusable narrative skeletons (beats), not stories |
| 3 | **Story Arcs** | Emotional/genre shape — tension, conflict, resolution |
| 4 | **Theme Library** | Surface content (dinosaurs, firefighters, space…) |
| 5 | **Personalization** | Weaves the child's details in without breaking the reading level |
| 6 | **Validation (QA)** | Automated gate that proves every book meets its level — **this is the moat** |
| 7 | **Content Safety** | Age-appropriateness, representation, IP safety |

A **two-track text** design gives each page a child-decodable line plus an optional adult read-aloud line — delivering rich language (the comprehension half of the Simple View of Reading) without raising the child's decodable load. The validation layer is load-bearing and gates every generated book **before** illustration.

---

## 7. Claims discipline (non-negotiable)

The internal rule: **describe the method, not the outcome.** This is the single most important brand guardrail — it is what keeps the company on the right side of the line that competitors crossed.

| Say this (method, verifiable) | Never this (outcome, unprovable) |
|---|---|
| "Built on systematic, explicit phonics." | "Proven to make kids read." |
| "Text is decodable at each level." | "Guaranteed reading results." |
| "Aligned with structured-literacy principles." | "Research-proven / research-backed results." |
| "Practice for the patterns a child is learning." | "The science-based way every child learns." |

Outcome claims are permitted **only** when backed by the company's own collected evidence (e.g., a pilot study) and stated with limits. Until then: method claims only.

**Vocabulary to use** (signals field literacy): structured literacy · systematic, explicit phonics · scope-and-sequence · decodable text · grapheme–phoneme correspondence · high-frequency / heart words · orthographic mapping · cumulative review · controlled vocabulary · decodability.

**Vocabulary to avoid:** "three-cueing," "MSV," "use the picture to figure out the word" (discredited); "sight words" meaning whole-word memorization; "proven / guaranteed / research-proven"; "leveled readers" unqualified (evokes the F&P/guessing tradition — say "decodable readers aligned to a scope-and-sequence").

**Anchor to non-proprietary frameworks** the field respects: the Simple View of Reading (Gough & Tunmer), Scarborough's Reading Rope, Ehri's phases / orthographic mapping, and Structured Literacy (International Dyslexia Association). Referencing these positions the brand inside the science-of-reading consensus without claiming to have invented or proven anything.

**Transparency is the trust moat:** publishing the methodology (scope-and-sequence, skills matrix, word-eligibility rule, validator checks, frameworks, and a clear statement of what is _not_ claimed) is the strongest credibility move. Companies that hide their leveling look like marketing; companies that publish it look like educators.

---

## 8. Legal & policy guardrails

- **Service-provider disclosure is category-based only** — payment processing, photo hosting, AI-assisted illustration, storage, email, hosting/analytics. Do **not** name vendors in customer-facing copy.
- **AI photo processing must be disclosed honestly.** Uploaded reference photos (including of children) _are_ sent to a third-party AI service to generate illustrations. Policies must disclose this; never claim photos stay "in-house." Photos are deleted after the first book is delivered.
- **Photo-consent UX:** the rights acknowledgment lives only in the final-step required consent checkbox, with a "How we use your photos" pop-out modal — not as inline text under the upload areas.

---

## 9. Audience-specific pitches

**Parent (warm):** "Books your child can actually read — starring your child. As they learn new letter sounds, the stories use exactly those sounds, so reading feels like a win every time."

**Teacher (method-led):** "Every book is decodable — kids sound out words using patterns they've already been taught, not guessing from pictures. It follows an explicit scope-and-sequence, and the stories are personalized so the practice feels worth doing. Here's the exact skills matrix behind each level."

**Researcher (invites scrutiny):** "We separated the educational engine from the story content. The engine is a systematic phonics scope-and-sequence with tracked high-frequency words; a validator enforces decodability, controlled new-word introduction, and cumulative review on every generated book. Personalization adds motivating proper nouns without raising the decodable load. We publish the scope-and-sequence and validation rules — happy to have them critiqued."

Leading with method and _inviting scrutiny_ is itself a credibility signal.

---

## 10. Skeptic FAQ (how the brand answers hard questions)

- **"Is this decodable or just leveled?"** → Decodable. Words are restricted to phonics patterns taught by that level, plus tracked high-frequency words.
- **"Do the pictures give away the words?"** → No, by design. Illustrations support meaning; children decode the text. Picture-guessing is a bug the validator guards against.
- **"How do you handle a child's name that isn't decodable?"** → It's treated as a personal proper-noun the child recognizes early and sees repeatedly; the rest of the page stays fully at-level so the decodable load doesn't rise.
- **"What's your evidence it works?"** → We don't claim proven outcomes. We build on structured-literacy principles and publish our method so you can judge it. We're running pilots to gather our own evidence.
- **"Is this Fountas & Pinnell leveling?"** → No. Our levels are defined by an explicit phonics scope-and-sequence, not the three-cueing tradition.
