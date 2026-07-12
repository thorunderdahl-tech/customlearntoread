# CustomLearnToRead — Story Generation System

> **⚠️ ARCHIVED DESIGN DOCUMENT (July 2026).** The canonical, shipped scope-and-sequence
> is the TypeScript engine: `lib/reading/phonics.ts` + `lib/leveling.ts` (see
> `docs/pedagogy-review-2026-07.md` for the reconciliation decisions). This folder is
> kept as design history; the Python engine and JSON schemas here are NOT executed by
> the app and have known divergences (blend ordering, final-y handling, heart-word list).
> Do not tune pedagogy from these files.

**Foundation & Architecture (v1)**
_Last updated: 2026-07-05_

This document is the design foundation for shifting from a fixed catalog of books to a
**repeatable, rule-driven system** that generates personalized decodable readers at scale.
It endorses the layered architecture we've been discussing, corrects the pedagogy at the
core, and fills the blind spots that would otherwise surface once we start producing books.

The machine-readable specs that the generation pipeline consumes live in `./schemas/`.
A worked example is in `./examples/`.

---

## 1. The core reframe (endorsed, with corrections)

The right instinct: **stop building a catalog, start building a system.** Separate the
educational engine from the story content so one set of rules can produce thousands of books.

Two corrections before we build:

1. **The educational engine must be phonics-first, not sight-word-first.** The current
   Dolch-list framing is built on whole-word memorization, which the research consensus has
   moved away from. See §2.
2. **The naming debate ("Adventures" vs "Stories") is the least important decision here.**
   It's a fine internal convention, but it doesn't change the architecture. The decisions that
   actually determine whether this scales are the **reading engine** (§2, §4) and the
   **validation layer** (§9). Use whatever internal word you like; we use "book" and "story"
   in this doc.

---

## 2. Pedagogy decision: hybrid phonics + heart words

**Decision: a structured-phonics scope-and-sequence is the spine; high-frequency "heart
words" are a small, explicitly-tracked subset layered on top.**

Why:

- **Systematic explicit phonics is the settled consensus.** The discredited practice is
  *three-cueing* — teaching children to *identify* a word by guessing from the picture/context
  instead of decoding it. This does **not** mean illustrations can't match the text; of course
  they should, and a child confirming a decoded word against the picture is good practice. The
  precise constraint is **dependency, not correspondence**: pictures may depict, enrich, and let
  a child *confirm* what they read, but **no in-level word's identification may _depend_ on the
  illustration.** Operational test: *cover the pictures — a child at level should still be able
  to read every in-level word.* The classic anti-pattern to avoid is the predictable book ("I see
  a ⬜, I see a ⬜") where the noun is only gettable by naming what's in the picture. **Intended
  exception:** the small, capped set of out-of-level personalization/theme anchor words (a child's
  favorite dinosaur species, etc.) are *designed* to lean on illustration support — see §8.
- **Most "sight words" are actually decodable.** On the Dolch list, words like _at, him, up,
  can, did, not, get, will, help, must_ follow regular phonics. Only a minority are genuinely
  irregular: _the, of, was, said, are, you, they, one, two, come, could_. We teach those as
  **heart words** — decode the regular part, memorize only the irregular letter(s) "by heart."
- **Decodable-only text can get sterile.** Pure decodables ("Nat the cat sat on the mat") are
  right at the bottom levels, but we loosen toward natural language as decoding is mastered.
  Personalization + theme are our antidote to sterility — a constrained sentence about *your
  child and their favorite dinosaur* is engaging in a way a generic decodable is not.

### The word-eligibility rule (the heart of the engine)

> A word may appear at Level N if **any** of the following is true:
> 1. It is **decodable** using phonics patterns taught by Level N; **or**
> 2. It is a **heart word** introduced at or before Level N; **or**
> 3. It is an **allowed personalization/theme token** (see §8), subject to that layer's caps.

Everything else — the levels, the skills matrix, the validator — is a formal expression of
this one rule.

---

## 3. The architecture (7 layers)

The five layers we discussed are correct but incomplete. Validation and content safety are not
"phase 5" afterthoughts — they are load-bearing and must exist before the first book ships.

| # | Layer | What it fixes | Schema |
|---|-------|---------------|--------|
| 1 | **Reading System** | Phonics scope-and-sequence, heart words, level constraints, skills matrix | `reading-levels.json`, `skills-matrix.json`, `gpc-table.json`, `heart-words.json` |
| 2 | **Story Templates** | Reusable narrative skeletons (beats), not stories | `story-templates.json`, `story-framework.json` |
| 3 | **Story Arcs** | Emotional/genre shape + tension, conflict, resolution | `story-arcs.json`, `story-framework.json` |
| 4 | **Theme Library** | Surface content (dinosaurs, firefighters, space…) | `themes.json` |
| 5 | **Personalization** | Weaves child's details in **without breaking the reading level** | `personalization.json` |
| 6 | **Validation (QA)** | Automated gate that proves every book meets its level | `validation-rules.json` |
| 7 | **Content Safety** | Age-appropriateness, representation, IP safety | `validation-rules.json` (safety block) |

The **book-spec** (`book-spec.schema.json`) is the assembled object that threads all seven
layers together and is what the illustration and layout steps consume.

### Runnable engine & supporting specs

The reading rules are not just prose — they're backed by a working engine and support layer:

- **`schemas/gpc-table.json`** — the phonics scope-and-sequence as data (grapheme→sound→level).
- **`schemas/heart-words.json`** — high-frequency words with the irregular "heart part" annotated.
- **`engine/decodability.py`** — segments any word into graphemes and decides decodability at a
  level; validates a book's child-track text (word eligibility, sentence length, cumulative
  review). Run `python3 decodability.py` for unit tests + a sample validation.
- **`engine/run_golden.py`** — re-validates the hand-checked golden books in `examples/golden/`
  after any change; exits non-zero on regression.
- **`schemas/reading-support.json`** — caregiver-coaching page, warm-up, tricky-word list,
  comprehension-prompt bank, and the cumulative-review rule (see also `two-track-text.md`).
- **`two-track-text.md`** — child-decodable line + optional adult read-aloud line, so a book
  delivers rich language (the comprehension half of the Simple View) without raising decodable load.

---

## 4. Layer 1 — Reading System

### Levels

Ten custom levels, defined by phonics patterns + heart words + sentence rules, each labeled
with a friendly grade/age band. **We deliberately do not brand these as Fountas & Pinnell or
Lexile:**

- **Not F&P.** The Fountas & Pinnell gradient is built on the discredited three-cueing model
  and is the subject of a December 2024 class-action lawsuit alleging deceptive
  "research-backed" marketing. Anchoring our brand to it imports that liability and looks dated.
- **Not official Lexile.** Lexile is proprietary to MetaMetrics and requires a signed license
  to assign official measures. We may mention an *approximate* grade/Lexile range for
  marketing, but we don't claim certified measures.

Each level in `reading-levels.json` specifies: cumulative phonics concepts, cumulative heart
words, max sentence length, max words/page, new-decodable-word budget per book, allowed
sentence structures, and which conventions (questions, dialogue, contractions, commas) are
"live." A rough progression:

| Level | Grade band | Phonics focus (new) | Max sentence | New words/book |
|-------|-----------|---------------------|--------------|----------------|
| 1 | PreK–K | Short **a**, CVC | 4 | 4–5 |
| 2 | K | Short **i, o** | 5 | 5–6 |
| 3 | K | Short **e, u**, all CVC | 6 | 6–7 |
| 4 | K–1 | Digraphs (sh, ch, th, ck) | 7 | 7–8 |
| 5 | 1 | Blends (st, bl, nd, mp) | 8 | 8–9 |
| 6 | 1 | Silent-e long vowels | 9 | 9–10 |
| 7 | 1–2 | Vowel teams (ai, ee, oa) | 11 | 10–12 |
| 8 | 2 | R-controlled (ar, or, er) | 12 | 12–14 |
| 9 | 2–3 | Diphthongs (oi, ou, oo, aw) | 14 | 14–16 |
| 10 | 3 | Multisyllable, suffixes, soft c/g | 16 | 16+ |

### Skills Matrix (the differentiator)

`skills-matrix.json` defines, for every teachable skill, the level it's **introduced** and the
level it's **mastered** (expected to appear without support). This is what lets us say
precisely what "Level 5" *means* and give every book measurable educational goals. Example rows:

| Skill | Introduced | Mastered |
|-------|-----------|----------|
| Short-a CVC | 1 | 2 |
| Consonant digraphs | 4 | 5 |
| Silent-e long vowels | 6 | 7 |
| Contractions | 4 | 5 |
| Dialogue / quotation marks | 5 | 6 |
| Compound sentences (and/but/so) | 5 | 6 |
| Complex sentences (because/when/before) | 7 | 8 |
| Multisyllable decoding | 8 | 10 |

> **Honest note on "mastered":** for a print/ordered-book product we have no direct signal that
> a child has mastered a skill. "Mastered" here means *"the level at which the system expects
> the skill unsupported and stops scaffolding it."* If we ever add app-based reading with a
> feedback loop, this column becomes an actual measurement rather than a design expectation.

---

## 5. Layer 2 — Story Templates

Templates are narrative skeletons of **beats**, not stories. One template → hundreds of books.
Example (`meet-goal-explore-challenge-learn-celebrate`):

```
Meet character → Introduce goal → Explore → Small challenge → Learn something → Celebrate
```

Each beat carries page budget and a purpose, so the generator knows how many pages a beat gets
at a given level and what that beat must accomplish. Templates are theme- and arc-agnostic.

---

## 6. Layer 3 — Story Arcs

Arcs set emotional and genre shape over the template: adventure, funny, competition, mystery,
discovery, helping, learning, calm/cozy. An arc modifies pacing, tone words, and the nature of
the "challenge" beat. `story-arcs.json` defines each arc's tone, tension curve, and resolution
style.

---

## 7. Layer 4 — Theme Library

Themes are pure surface content: dinosaurs, princesses, garbage trucks, dogs, firefighters,
space, sports, etc. `themes.json` gives each theme its setting options, a small set of **theme
anchor words** (with decodability flags — see §8), and illustration motifs. Themes are the
easiest axis to expand and should be data, never code.

---

## 8. Layer 5 — Personalization (and the token blind spot)

Personalization is where a naive design breaks the reading level, because **a child's details
routinely violate the phonics rules**: a name might be _Siobhan_ or _Xavier_; a favorite
dinosaur might be _Pachycephalosaurus_. Rules:

- **The child's name is always allowed**, regardless of decodability. It's the most motivating
  word in the book, children recognize their own name very early, and it repeats. Treat it as a
  **personal proper-noun heart word.**
- **Theme anchor words** (e.g., a dinosaur species) are allowed but **capped**: at most 1–2
  out-of-level anchor words per book, each introduced once and then repeated, with illustration
  support and an optional in-story short-name ("her Pachy").
- **The balancing rule:** personalization may add motivating out-of-level *proper nouns/anchor
  words*, but it **must not raise the decodable difficulty of the surrounding text.** On any
  page containing an out-of-level personal/theme token, every *other* word on that page must be
  fully at-level. This keeps the reading load flat while the content feels custom.
- **Hard-name flag:** profiles carry a `name_complexity` flag so layout/illustration can give a
  long or unusual name room, and so we never let a hard name crowd a page with other new words.

`personalization.json` defines the child profile fields and these token-handling rules.

---

## 9. Layer 6 — Validation (the real moat)

This is the single most important addition. An automated validator gates **every** generated
book before it can proceed to illustration/print. It is what lets us "do very little once we
start" — quality is enforced by rule, not by human review of every title.

Inputs: generated page text + target level + child profile.
Checks (all in `validation-rules.json`):

1. **Word eligibility** — every content word is decodable-by-level, a live heart word, or an
   allowed personal/theme token. Any violation is flagged with the offending word.
2. **Decodability ratio** — running-word decodability meets the level threshold.
3. **Sentence length** — within the level cap.
4. **New-word budget** — count of newly-introduced words within range.
5. **Repetition** — each new content word meets the minimum repetition count.
6. **Allowed structures** — sentence types (simple/compound/complex) permitted at the level.
7. **Conventions** — questions/dialogue/contractions/commas appear only once introduced.
8. **Four-questions structure** — the story answers Who / What / Why / How (see §11).
9. **Content safety** — passes the safety block (§10).
10. **Illustration-prompt consistency** — character/theme descriptors are identical across pages.

Output: `pass | fail` + a per-rule report + the specific offending tokens, feeding a
**regenerate-with-constraints** loop. Target: a book only ships when it passes all hard rules.

---

## 10. Layer 7 — Content Safety

A hard layer, not a nicety. Encoded in the safety block of `validation-rules.json`:
age-appropriate stakes only (mild, resolvable challenges — no real peril, injury, or death),
no frightening imagery, kindness-positive resolutions, inclusive and respectful representation,
and **no infringing IP as themes** (generic "space explorer," not a trademarked franchise).

---

## 11. Every story answers Who / What / Why / How

Kept from the original plan — it's a strong story spine that prevents "things just happen":

- **Who?** Usually the child.
- **What?** What they want (concrete, tiny is fine).
- **Why?** Why it matters to them.
- **How?** How they succeed — practice, helping, creativity, kindness, teamwork.

This is enforced structurally by check #8 in the validator and is a field on the book-spec.

---

## 12. The variety engine (competitive advantage)

Promise: **no two books alike, even within the same theme + level.** Implemented as a
combination space plus a per-child anti-repeat memory. For each child we log the tuple
`(template, arc, setting, tone, objective)` of every book produced. The generator must choose a
new tuple that differs from recent books by a minimum number of axes before it may repeat a
theme+level. The **educational progression stays identical**; the reading *experience* stays
fresh. This is what makes the subscription sticky.

> Reality check the original plan glossed over: **variety scales with level.** At Level 1 the
> vocabulary is tiny, so "500 distinct books" is not achievable at the bottom — genuine variety
> lives at the *arc/setting/tone/personalization* layer there, not the sentence layer. Set the
> variety promise per-level, and lean hardest on personalization and illustration for beginners.

---

## 13. How the schemas fit together (generation pipeline)

```
child profile ─┐
target level ──┤
theme ─────────┼──► SELECT (variety engine picks template + arc + setting + tone + objective)
               │        │
               │        ▼
               │   ASSEMBLE book-spec  ◄── reading-levels + skills-matrix (constraints)
               │        │                   story-templates + story-arcs (structure)
               │        │                   themes + personalization (content)
               │        ▼
               │   GENERATE page text (LLM, constrained by the assembled spec)
               │        │
               │        ▼
               └─►  VALIDATE (validation-rules)  ──fail──► regenerate with flagged fixes
                        │ pass
                        ▼
                   ILLUSTRATE (per-page prompts + character/theme reference sheet)
                        │
                        ▼
                   LAYOUT / PRINT / DELIVER
```

Character consistency across pages (and across a child's series) is handled by generating a
**reference sheet** once per book/child — fixed descriptors for the character, theme objects,
and art style — and threading it into every page's illustration prompt.

---

## 14. Blind-spot summary

| Blind spot in the original plan | Resolution |
|---|---|
| Engine built on sight words (Dolch) | Phonics-first hybrid; heart words as a tracked subset (§2) |
| No validation / QA layer | Automated validator gates every book (§9) — the moat |
| Personalization breaks the reading level | Token-handling + balancing rules (§8) |
| Illustrations could invite word-guessing | Refined: pictures may/should depict the text — only *dependency* is barred. In-level words must be readable with pictures covered; capped out-of-level tokens may rely on art (§2, §8) |
| Character consistency across pages ignored | Reference-sheet threading (§13) |
| "Mastered" implies measurement we don't have | Redefined as scaffolding-stop; real measurement only with a feedback loop (§4) |
| Variety promised uniformly | Variety scales with level; per-level promise (§12) |
| No content-safety layer | Hard safety layer (§10) |
| No placement/assessment mechanism | Open item — see §15 |
| "Adventures vs Stories" over-weighted | Deprioritized; naming ≠ architecture (§1) |

---

## 15. Revised roadmap

1. **Reading System** — levels, phonics scope-and-sequence, heart words, skills matrix. _(Done as schema v1.)_
2. **Validation layer** — build the validator *alongside* the reading system, not later. It's
   how everything else stays honest.
3. **Story + Arc system** — templates, arcs, the four-questions spine, page budgeting.
4. **Theme library** — start with 8–12 themes as data; expand indefinitely.
5. **Personalization engine** — profile fields + token-handling/balancing rules.
6. **Illustration consistency** — reference-sheet pipeline for character/theme/style.
7. **Variety engine** — anti-repeat memory + combination selection.
8. **Placement** _(open)_ — how a child is initially leveled (parent quiz? short reading
   check?). Needed for retention; design before launch even if v1 is a simple parent selector.

## 16. Open decisions to confirm

- **Placement mechanism** for initial leveling (§15.8).
- **Book length** — fixed page count per level, or variable? (Schemas assume ~12–16 pages.)
- **Print vs app (or both)** — determines whether the skills matrix "mastered" column can ever
  become a real measurement.
- **Series continuity** — should a child's character/world persist across books, or reset each
  time? (Affects the reference-sheet and variety engine.)
