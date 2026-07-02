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
| Vocabulary gate | **strict**: Dolch pre-primer/primer sight words + CVC words | **moderate**: + Dolch 1st grade & nouns, CVCe, -s forms | none (length rules only) |
| Commas | no | no | no |
| Dialogue | no | no | short only (≤ 3 words, prompt-enforced) |
| Contractions | no | no | no (n't, 'll, 're, 've, 'm, 'd flagged; possessive 's allowed) |

## Topic-word exemption

A word appearing on 3+ pages is being taught by repetition and pictures, so it's exempt from length/decodability rules — **capped at the 2 most frequent such words per book** so repetition can't smuggle in a hard vocabulary. The child's name is always allowed.

## Title

Every title word must be the child's name, a topic word, or within the moderate vocabulary gate — the child should be able to read their own book's title.

## QA flow

1. `checkStory` (pure code, no AI) — the rules above; failures auto-trigger one revise pass.
2. AI grade (strict rubric: decodability, repetition/predictability, hero, arc, art directions, safety/rights); failures trigger revise + re-grade.
3. Admin reads, hand-edits if needed, and approves.
