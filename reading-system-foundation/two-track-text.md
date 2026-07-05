# Two-Track Text

> **Status: OPTIONAL — a website toggle, OFF by default.** Standard books are single-track
> (child-decodable text only), to protect the core "my child read it themselves" experience.
> Parents can opt in to grown-up read-along lines per book/subscription. The schema fields
> (`adult_read_aloud`, `language`) support it and the validator already ignores the adult track,
> so turning it on changes nothing about decodability.

---

## Product decision: make it an opt-in, not the default

Two-track text is a *strong optional feature, not a must-have*. It strengthens the
language-comprehension half of reading, but it is not required to learn to decode, and a
grown-up paragraph on every page can crowd the illustration and dilute the "I read a whole book
myself" magic that is the product's emotional core. So it lives as a **toggle** on the website,
off by default, and is most worth offering at Levels 1–2 where the child's own text is thinnest.

## Feature name

**Parent Read-Along Lines** — with the credibility subtitle *"comprehension support for early
readers."* (The plain description "early-reader parent lines for reading comprehension" works as
the one-line explainer.) The name does double duty: it's clear to parents *and* it signals to a
teacher or researcher browsing the site that you understand reading has a comprehension half —
not just phonics.

## Website copy (parent-facing)

**Toggle label:** Add Parent Read-Along Lines

**Inline text shown at the toggle (explain it right there):**
> Add one extra line per page for *you* to read aloud — richer words and a fuller story — while
> your child reads their own simple line. Built to support reading comprehension. Your child
> still reads their line; you read yours. [Learn more]

## Explanation page (credibility-forward)

**Heading:** Parent Read-Along Lines — comprehension support for early readers

> Learning to read has two halves. One is **decoding** — sounding out words, which every
> CustomLearnToRead book is carefully built to practice. The other is **language comprehension** —
> vocabulary, ideas, and story. This distinction comes from the *Simple View of Reading*, a
> long-standing framework in reading research: strong reading needs both halves.
>
> Here's the useful part: young children can *understand* far richer language than they can decode
> on their own. **Parent Read-Along Lines** give each page a second line — written for a grown-up
> to read aloud — with bigger words and a fuller story. Your child proudly reads their own simple,
> fully-decodable line; you read yours. They practice sounding words out *and* hear rich language
> at the same time.
>
> We keep this optional, and off by default, because the heart of every book is your child reading
> it themselves. But if you'd like to build vocabulary and a love of stories alongside their
> phonics practice, this is a lovely way to do it — especially for the earliest levels, where a
> child's own text is necessarily simple.

**Claims discipline (per positioning-and-credibility.md):** describe the method ("supports
comprehension," "built on the Simple View of Reading"), never the outcome. Do not say "proven to
improve comprehension" or similar.

## Visual distinction — teach once, then let typography carry it

**Decision: explain the convention one time at the front of the book, then distinguish the two
lines on interior pages by type style alone — no repeated "Grown-up reads" label on every page.**
A per-page label reads as UI clutter and makes the book feel like a worksheet. Once a parent
learns the two styles, the type does all the work.

The two lines must be instantly tellable apart, and the **child's line stays dominant**:

| | Child line | Grown-up line |
|---|---|---|
| Size | Large (primary reading size) | Smaller (~65%) |
| Weight/style | Bold, upright | Regular, italic |
| Color | Dark / primary | Muted grey |
| Placement | Top of the text area | Directly below (a hairline rule is optional) |
| Per-page label | none | none — taught once up front, not repeated |

**Front-of-book key (the only place it's spelled out):**
> The big words are for your child to read. The small words in italics are for a grown-up to read
> aloud.

**Keep the convention identical across every book.** Big/bold = child, small italic/muted =
grown-up, everywhere, always. The parent learns it once for the whole series, so the front key
becomes a gentle reminder rather than instructions.

Rationale: the child should still see *their* line as "the book." The grown-up line reads as a
quiet add-on, clearly not something the child is expected to decode — which also keeps it from
becoming an accidental source of word-guessing pressure.


**Why:** Reading = decoding × language comprehension (the Simple View of Reading). A strict
decodable book develops decoding beautifully but starves the *language* half — the vocabulary,
syntax, and knowledge that a 5-year-old's spoken understanding can handle long before their
decoding can. Two-track text solves both at once.

**How:** every page carries two lines.

- **Child track (`text`)** — fully decodable at the book's level. This is what the child reads
  and the *only* thing the decodability/eligibility validator checks. It never exceeds level.
- **Adult track (`adult_read_aloud`)** — an optional richer line the caregiver reads aloud. Not
  decodability-constrained; it may use Tier-2 vocabulary and more complex sentences. It is
  excluded from decodability checks and carries the language-comprehension load.

From the sample book, page 4:

> **Child reads:** "I sit. I am not mad. I get a red ball."
> **Adult reads:** "Mia decides to be *patient*. Instead of chasing, she sits down and
> *coaxes* him with his favorite red ball."

The child never decodes above level, yet the book still delivers *patient*, *coax*, *soggy*,
*delighted*, and the idea that staying calm helps a scared animal approach. The book's
`language` block declares its `tier2_vocab`, `background_knowledge`, and which of Scarborough's
language-comprehension strands it touches, so vocabulary and knowledge become deliberate,
trackable goals — not accidents.

**Product notes.** The adult track is optional per level: lean on it heavily at Levels 1–3
(where the decodable text is necessarily spare) and taper as the child's own reading grows
richer. It's also a natural upsell and a strong credibility signal — it shows teachers you
understand that decoding is only half of reading.
