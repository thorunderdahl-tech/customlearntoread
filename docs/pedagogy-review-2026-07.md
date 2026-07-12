# Pedagogy Review — Scope & Sequence Audit

*July 11, 2026. Audit of the shipped decodability engine (`lib/reading/phonics.ts` + `lib/leveling.ts`) against the design spec (`reading-system-foundation/`) and mainstream structured-literacy practice. Written as a decision packet: each numbered item ends with a recommendation you can approve, modify, or reject. Nothing here is implemented yet except where marked DONE.*

---

## 1. The two sources of truth disagree — pick one (D1)

The repo carries **two** scope-and-sequences that have drifted apart:

| | Shipped TS engine (what customers get) | Foundation spec (`reading-system-foundation/`) |
|---|---|---|
| 2-consonant blends | Level **3** (with short e/u) | Level **5** (after digraphs) |
| Digraphs sh/ch/th/wh/ck | Level 4 | Level 4 ✓ |
| 3-consonant clusters | Level 5 (added July 2026) | not modeled |
| Final-y as vowel (fly/happy) | Level 7 (added July 2026) | *intended* L10, but its engine's min-level collapse makes it L3 — a bug the shipped engine no longer shares |
| Heart words | 66 words (extends the foundation list by 11: look, play, down, now, out, saw, put, want, how, good, too, school) | 56 words; internally inconsistent (heart-words.json has "me" at L3, reading-levels.json omits it) |
| Numeric caps | Tiny: 1–3 words/page | L1: 8 words/page, 4-word sentences |

**The blends-vs-digraphs order is not a "who's right" question — major programs disagree with each other.** UFLI Foundations teaches CCVC/CVCC blend words *before* digraphs; Wilson/Fundations teaches digraphs *before* blends (a digraph is one new grapheme to learn; a blend is no new grapheme, just harder phoneme blending). Both are defensible structured-literacy sequences. The shipped engine matches the UFLI-style order.

**Recommendation:** declare `lib/reading/phonics.ts` + `lib/leveling.ts` the single canonical scope-and-sequence. Mark `reading-system-foundation/` as an archived design document (one-line note in its README), fix or ignore its internal "me" inconsistency, and delete the committed `__pycache__/*.pyc`. Do NOT try to keep two engines in sync — the Python one already has the final-y bug the TS one fixed.

## 2. Should Tiny Readers get blend words at all? (D2) — the one real pedagogy question

Tiny (ceiling 3) currently allows any 2-consonant blend: *jump, nest, stop, fast, hand*. The prompt even cites *jump/nest* as examples. For comparison: BOB Books Set 1 is pure CVC; UFLI does ~34 lessons of CVC before blends. Blending 4 phonemes (/j/ /u/ /m/ /p/) is meaningfully harder than 3 and is the point where a shaky 4-year-old stalls.

But banning blends at Tiny would shrink the word pool hard (*jump, hand, fast, nest, sand, hop→fine* …) and Tiny books lean on repetition + pictures, which scaffolds exactly this difficulty.

Options:
- **(a) Keep as is.** Blends allowed at Tiny; repetition carries it. Zero work.
- **(b) Soft cap (recommended).** Keep blends legal at Tiny but have `checkStory` emit a *warning* (non-blocking) when more than ~3 distinct blend words appear in a Tiny book, and tell the generation prompt to prefer pure CVC. Books stay generatable; the mix skews easier. ~20 lines.
- **(c) Hard move** blends to level 4+. Tiny becomes pure CVC + heart words. Strictest, most "defensible," and most likely to make Level-1 generation fail to converge.

**Recommendation: (b).** It matches how real Tiny readers are built (mostly CVC, a few high-value blend words like *jump*) without breaking the generator.

## 3. Confirmed-correct things (no action)

- **Sequence backbone** short vowels → digraphs → -ng → magic-e → vowel teams → r-controlled → diphthongs → multisyllable matches mainstream practice (the r-controlled/vowel-team order varies by program; either is fine).
- **Multi-sound graphemes gate at their easier reading** (ow=7, ea=7): deliberate in both engines; the alternative (gating *cow* to level 9) is stricter than any real program.
- **Heart-word philosophy** (decode the regular parts, memorize the tricky grapheme; not a Dolch whole-word list) is exactly the orthographic-mapping-aligned approach, and the foundation's anchor citations (Simple View, Scarborough, Ehri, IDA Structured Literacy) are the right, non-proprietary ones.
- **July 2026 fixes already shipped (DONE):** 3-consonant clusters gated to L5; final-y as vowel at L7; irregular spellings (*love, gone, give, done, were, are, there…*) rejected at every level so they can only enter as taught heart words.

## 4. Gaps worth fixing (D3–D6)

**D3 — Open-syllable false positives: *no, so, be, hi*.** These pass the engine as short-vowel CVC ("noh"? "soh"?) at ceiling 2–3 but are pronounced long — same bug class as *fly*, unfixed for CV words. They're extremely common in early books. **Recommendation:** add them to the heart-word table (*no* L2, *so* L2, *be* L2, *hi* L3) — additive, zero risk, matches how programs actually teach them ("open syllable" or heart). ~4 lines.

**D4 — `tch` at level 10 is too late.** *catch, match, pitch* are grade-1 words taught alongside/just after `ch`. At level 10 they're unavailable to Growing readers (ceiling 8) — the generator writes around them or they leak via the topic exemption. **Recommendation:** move `tch` to level 8. (`ph/kn/wr` at 10 are fine — genuinely late skills.)

**D5 — No suffix handling beyond `-s`.** *-ing* works by accident (i+ng graphemes), *-ed* doesn't exist as a rule: *jumped* tokenizes j-u-mp-e-d and gets mis-scored as magic-e-ish or fails. Foundation declares -ed at L7 but neither engine implements morphology. Mostly affects Growing/Confident, where decodability is looser, so impact is low. **Recommendation:** defer; note as known limitation. (A proper fix is a small suffix-stripper: strip -ed/-ing/-er/-est, score the stem, add a suffix level.)

**D6 — Production heart-word extensions are undocumented.** The 11 words production added beyond the foundation (look, play, down, now, out, saw, put, want, how, good, too, school) are all reasonable early HF words, but the *rationale* lives nowhere. **Recommendation:** accept them as canon; add one comment line in `leveling.ts` noting they extend the foundation list deliberately.

## 5. Marketing/credibility notes

- The four-framework grounding (Simple View · Scarborough's Rope · Ehri's phases · IDA Structured Literacy) is solid and safely non-proprietary. Keep using the approved vocabulary list; keep avoiding "proven/guaranteed."
- The custom level names (avoiding F&P/Lexile) remain the right call — the foundation's litigation rationale still holds.
- Once D2–D4 are settled, the parent-facing "reading approach" page and `docs/reading-levels.md` (still describing the old Dolch-based system — flagged in the earlier audit) should be rewritten from the canonical TS engine so marketing, docs, and code finally say the same thing. Happy to do this once you've decided.

## 6. Decision summary

| # | Decision | My recommendation | Effort |
|---|---|---|---|
| D1 | Canonical source of truth | TS engine canon; archive foundation; delete .pyc | trivial |
| D2 | Blends at Tiny | Soft cap + prompt bias toward CVC | small |
| D3 | no/so/be/hi | Add as heart words | trivial |
| D4 | tch level | 10 → 8 | trivial |
| D5 | Suffix morphology | Defer, document | none |
| D6 | Extended heart list | Accept as canon, document | trivial |

Reply with e.g. "approve D1, D3, D4, D6; do D2 as option (b)" and I'll implement and re-run the regression suite.
