# Reading Level Requirements

Source of truth for text rules. Enforced deterministically in `lib/leveling.ts` (`checkStory`) and by prompt + AI grader in `lib/story.ts`. Books are BOB-Books-style: the CHILD reads them, pictures carry the story.

## Levels

| | Tiny Reader | Beginner Reader | Growing Reader |
|---|---|---|---|
| Order form | Level 1 | Level 2 | Level 3–4 |
| Age fallback | ≤ 4 | 5–6 | 7+ |
| Sentences/page | exactly 1 | exactly 1 | exactly 1 |
| Words/page | 1–3 | 3–6 | 4–10 |
| Max avg word length | 4.0 | 4.4 | 5.0 |
| Name on pages | ≥ 50% | ≥ 50% | ≥ 40% |
| Vocabulary gate | **strict**: Dolch Pre-Primer + CVC words | **moderate**: + Dolch Primer/1st grade & nouns, CVCe, -s forms | none (length rules only) |
| Sight-word teaching set | **8–10 distinct core words** (see below) | reuse sight words; no fixed budget | — |
| Duplicate pages | never | never | never |
| Commas | no | no | no |
| Dialogue | no | no | short only (≤ 3 words, prompt-enforced) |
| Contractions | no | no | no (n't, 'll, 're, 've, 'm, 'd flagged; possessive 's allowed) |

## Level 1 sight-word teaching set

Tiny Reader books follow the BOB Books / Scholastic Sight Word Readers model: each book deliberately **teaches a set of 8–10 words**, reused throughout, on top of the fun personalized topic. Rules (enforced in `checkStory`):

1. The book's core vocabulary — everything except the child's name, cast names (friend/pet), and topic words — must be **8–10 distinct words**.
2. Core words come from the **Dolch Pre-Primer list** (a, and, away, big, blue, can, come, down, find, for, funny, go, help, here, I, in, is, it, jump, little, look, make, me, my, not, one, play, red, run, said, see, the, three, to, two, up, we, where, yellow, you). Flexibility: **up to 2** core words may instead be Dolch Primer words or simple CVC phonetic words (hop, sit, nap).
3. **Reuse**: each teaching word should appear on 2+ pages (at most 2 single-use words tolerated) — a word used once teaches nothing.
4. **No two pages may have identical text** (all levels) — every page must move the reading forward.

Reference models: BOB Books Set 1 introduces only ~5 sight words across the whole set with heavy repetition and CVC decodables; Scholastic Sight Word Readers each teach ~2 focus words in an 8-page predictable format. Our 8–10-per-book set sits between, matched to a 20-page personalized book.

## Topic-word exemption

A word appearing on 3+ pages is being taught by repetition and pictures, so it's exempt from length/decodability rules — **capped at the 2 most frequent such words per book** so repetition can't smuggle in a hard vocabulary. The child's name is always allowed.

## Title

The title must be readable too: every title word must be the child's name, a topic word, or within the moderate vocabulary gate.

## QA flow

1. `checkStory` (pure code, no AI) — the rules above; failures auto-trigger one revise pass.
2. AI grade (strict rubric: decodability, repetition/predictability, hero, arc, art directions, safety/rights); failures trigger revise + re-grade.
3. Admin reads and approves. The admin can always hand-edit page text before art.
