# Reading Levels — Canonical Reference

*Rewritten July 11, 2026 from the shipped engine (`lib/reading/phonics.ts` + `lib/leveling.ts`), which is the single source of truth (pedagogy review D1). The previous version of this doc described the superseded Dolch-based system — everything here now matches the code. Books are BOB-Books-style: the CHILD reads them, pictures carry the story.*

## The four production levels

| | Tiny Reader | Beginner Reader | Growing Reader | Confident Reader |
|---|---|---|---|---|
| Order form | Level 1 | Level 2 | Level 3 | Level 4 |
| Age fallback | ≤4 | 5–6 | 7–8 | 9+ |
| Sentences/page | exactly 1 | exactly 1 | exactly 1 | 1–2 |
| Words/page | 1–3 (stretch 4 on ≤30% of pages) | 3–6 (stretch 7) | 4–10 | 6–14 |
| Max avg word length | 4.5 | 4.4 | 5.0 | 5.5 |
| Phonics ceiling (see scope below) | 3 | 6 | 8 | none (open) |
| Heart-word ceiling | 2 | 4 | 7 | 10 |
| Teaching set | 12–15 distinct core words: ≥8 repeat on 2+ pages (the backbone), ≤5 single-use story words | 18–30: ≥12 repeat, ≤8 story words | open, reuse encouraged | open |
| Name on pages | ≥50% | ≥50% | ≥40% | ≥30% |
| Commas / contractions / dialogue | none | none | short dialogue only | all allowed |
| Duplicate page text | never (all levels) | | | |

Always allowed at every level: the child's name (**every part** of a multi-word or hyphenated name), cast names locked in `castDescriptions`, and the topic cluster — the main topic word + up to 2 related theme words, each repeated on 3+ pages (capped at 3 exempt words per book).

## The 10-level phonics scope (grapheme → level)

1. short **a** + m s f n l r t p c d g b h
2. short **i, o** + k v w j
3. short **e, u** + x z y(consonant) qu; **2-consonant blends** (st, tr, mp, nd) — *soft cap at Tiny: warning if >3 distinct blend words per book (D2); most words should be pure CVC*
4. digraphs **sh ch th wh ck**
5. **ng / -ing**; **3-consonant clusters** (str, spl, scr)
6. **magic-e** (a_e, i_e, o_e, u_e)
7. vowel teams **ai ay ee ea oa ow igh**; **final-y as a vowel** (fly, happy)
8. r-controlled **ar or er ir ur**; **tch** (catch, match)
9. diphthongs **oi oy ou oo aw au**
10. multisyllable, soft c/g, **ph kn wr**, prefixes/suffixes

Engine details: multi-sound graphemes gate at their easier reading (ow/ea = 7 — deliberate, matches how programs introduce them). Irregular spellings that lie about their sounds (*love, gone, give, done, none, were, are, there, where, some, come, have, one, once, sure*, plus open-syllable *no, so, be, hi*) are **never** classified as sound-outs — they pass only as taught heart words. Known limitation (D5, deferred): no suffix morphology, so *-ed* forms mis-score at the upper levels.

## Heart words

66 high-frequency words with intro levels 1–10 (`HEART_WORD_TABLE` in `lib/leveling.ts`): true heart words (an irregular part is memorized — *the, was, said*) vs regular-but-early HF words (*see, look, play*). The table deliberately extends the archived foundation list (D6). The printed "Why These Words?" page derives its sound-out vs by-heart split from this same table (`wordKind()`), so the book and the validator can never disagree.

## QA flow

1. `checkStory` (pure code, no AI): everything in the tables above, plus title readability, the four-questions story spine, and soft warnings (cumulative review ≥40%, practices-own-level ≥2 words, Tiny blend cap). Failures auto-trigger revise passes (which re-receive the story plan and order constraints).
2. AI grade (strict rubric: decodability, repetition, hero, arc, art directions, charm, safety/rights); failures trigger one revise + re-grade cycle.
3. Human review before delivery — via the review queue (`/admin/review`) or create screen.

Regression suite: `npm run test:reading` (must pass before/after any change to leveling/phonics). Live benchmark: `npm run eval:stories`.

## Positioning

Custom levels by design — not Fountas & Pinnell, not Lexile (litigation/licensing risk; see the archived `reading-system-foundation/positioning-and-credibility.md`, still the marketing-language guide). Anchor frameworks: Simple View of Reading, Scarborough's Rope, Ehri's orthographic mapping, IDA Structured Literacy. Say "structured literacy / systematic phonics / decodable text"; never "proven / research-proven / guaranteed."
