# Story Generation Instructions (reference)

This is the complete set of instructions that drive story development — the prompts sent to the AI, plus the rules injected into them at generation time. It's a plain-English map of what's actually in the code, so you can review or tune the pedagogy without reading TypeScript.

## How a story gets made

The admin **Create a book** tool calls `/api/admin/story` (`app/api/admin/story/route.ts`). One model call per step:

1. **generate** — builds the draft. Sends the **System prompt** + a **Generate prompt** assembled from: the order details, the reading-level rules, the phonics scope for that level, a randomly-chosen "story plan" (for variety), and the brand voice. Model returns a JSON book (title, character description, cast, four-questions, and a `text` + `artPrompt` per page).
2. **grade** — a strict quality gate re-reads the draft against the level rules and returns pass/fail + issues.
3. **revise** — feeds the issues back and asks for a corrected draft.
4. **save** — writes the approved draft (and a "variety key") back to Airtable.

The text model is Claude (`lib/llm.ts`). A separate systematic **phonics checker** (`lib/reading/phonics.ts`) mechanically rejects any word outside the level's letter-sound scope, so the prompt and the validator enforce the same thing.

All prompt text below is quoted verbatim from the code. File sources are noted per section.

---

## 1. System prompt — the constant rulebook

*Source: `lib/story.ts` → `STORY_SYSTEM`. Sent on every generate / grade / revise call.*

> You create personalized learn-to-read books for the family business "Custom Learn to Read".
> THE GOAL IS NOT A STORY FOR PARENTS TO READ ALOUD. The goal is a book the child can successfully read THEMSELVES — like early BOB Books. Pictures carry most of the story; the text supports the picture.
> WRITING RULES — DO: repeat vocabulary often; repeat sentence patterns; use predictable language; use concrete nouns; use familiar actions; keep the story positive; make the child the hero on every page.
> DO NOT: use long sentences; use figurative language; use complex vocabulary; use multiple actions per page; use trademarked characters; use copyrighted brands, teams, logos, or franchises (generic versions only — "a race car", never a branded one).
> DECODABLE-TEXT PRINCIPLE: this is systematic phonics, not guessing from pictures. Every word must be sound-out-able with the letter-sounds the child has been taught at their level, plus a small set of taught high-frequency "heart" words, the child's name, and the book's topic word. The exact phonics scope for this book's level is given in the level rules — a code-based phonics check rejects any word outside it, so write inside the scope the first time.
> Level rules are HARD constraints, not suggestions. You reply with a single JSON object and nothing else.

Immediately followed by the **Brand voice** block (below).

## 2. Brand voice (appended to the system prompt)

*Source: `lib/brand.ts` → `BRAND_STORY_VOICE`.*

> BRAND VOICE (Custom Learn to Read):
> - Warm, plain-spoken, confident, encouraging — reassuring, never hype-y. Confidence over challenge.
> - The child is ALWAYS the hero and ALWAYS succeeds; the ending is positive; the child is NEVER the joke. Every book builds reading confidence.
> - Personal and modern; never flashy, overstimulating, babyish, corporate, or "AI-sounding."
> - Do NOT feature the brand mascot (Bella, a calm goldendoodle) inside the child's story unless the order specifically asks for a dog — the child is the star, not a mascot.
> - Default feeling is happy and positive for every character. Only give a page a different emotion if the story genuinely needs it; keep any non-positive feeling rare and mild, and resolve it warmly. In the illustration directions (artPrompts), describe characters as happy/smiling unless the beat truly calls for another gentle feeling.

---

## 3. Generate prompt — the per-book instructions

*Source: `lib/story.ts` → `buildGeneratePrompt`. Values in `{{...}}` are filled from the order, level, and story plan.*

```
Create a personalized learn-to-read book as JSON.

THE CHILD (the hero — appears on every page):
- Name: {{child name}}
- Age: {{age}}
- Pronouns: {{pronouns, or "write around pronouns if unclear"}}
- Appearance: hair …; eyes …; skin tone …; glasses/accessories …; clothing …; {{look notes}}

THE BOOK:
- Main topic: {{Theme 1}}
- Supporting characters/objects to weave in: {{Theme 2, Theme 3, or "invent at most one simple friendly companion"}}
- Special details from the parent (use them — they make the child feel seen): {{special details}}
- Emotional goal of the story: {{chosen goal, or "pick the best fit: confidence, friendship, kindness, trying something new, teamwork, or courage"}}
- MUST-USE words (work each in naturally): {{optional}}
- Words to AVOID entirely: {{optional}}

READING LEVEL — HARD RULES ({{level label}}):
{{level.promptRules — see section 4}}

{{phonics scope — see section 5}}

{{story plan — see section 6}}

{{if Parent Read-Along ordered: also write an "adultLine" per page — one richer grown-up
read-aloud sentence describing the same moment, not limited by the child's reading level}}

FORMAT:
- Exactly {{pageCount}} interior pages. ONE sentence per page. ONE illustration per page. No paragraphs.
- Spread the story across the pages following the STORY PLAN above (or beginning → small challenge → happy ending). One clear problem, resolved warmly.
- Repeat key vocabulary throughout so earlier pages teach the words later pages use.

ILLUSTRATION DIRECTIONS:
- Each page needs an "artPrompt": 2-3 concrete sentences that carry the story visually. Always specify:
  (1) the child's action + facial expression, (2) the setting and 1-2 background elements,
  (3) camera framing (wide / close-up / low angle) — vary framing across pages.
- The picture must tell the story even if the child can't read the words yet.
- Refer to the hero as "the child character" and keep their appearance identical on every page.
- EVERY other recurring character (friend, sibling, pet) MUST get a "castDescriptions" entry locking
  their exact appearance — a missing entry means that character will drift.
- Compose every scene in the UPPER TWO-THIRDS of a portrait frame (reading-text band covers the bottom;
  print trimming crops the outer edges).
- Clean simple backgrounds, large readable facial expressions.
- NEVER describe any words, letters, signs, numbers, logos or brands in the illustration.

Reply with ONLY this JSON shape:
{ title, levelId, childName, characterDescription, castDescriptions[], coverArtPrompt,
  fourQuestions{who,what,why,how}, pages[{ n, text, (adultLine), artPrompt }] }
```

---

## 4. Reading-level rules (injected as the "HARD RULES")

*Source: `lib/leveling.ts` → each level's `promptRules`. The order's reading level (or the child's age) picks one.*

**Tiny Reader** (Level 1) — 1–3 words per page:

> This book TEACHES a sight-word set, like BOB Books and Scholastic Sight Word Readers. FIRST choose the book's teaching set: 8-10 different words from the Dolch Pre-Primer list ONLY: a, and, away, big, blue, can, come, down, find, for, funny, go, help, here, I, in, is, it, jump, little, look, make, me, my, not, one, play, red, run, said, see, the, three, to, two, up, we, where, yellow, you. At most 2 of the 8-10 may instead be short phonetic CVC words (like hop, sit, nap) if the story needs an action word. THEN write every page using ONLY: that teaching set + the child's name + the book's topic word(s) (like dinosaur — repetition and pictures teach those). Reuse every teaching word on multiple pages — a word used once teaches nothing. Exactly ONE tiny sentence or label per page, 1-3 words (e.g. 'A cat.', 'Sam hops.', 'Big dog!'). One strong repeating sentence pattern with one slot changing. NO two pages may have identical text. Present tense. No commas, no dialogue.

**Beginner Reader** (Level 2) — 3–6 words per page:

> Exactly ONE sentence per page, 3-6 words, like early BOB Books: 'I see a cat.' 'I can run.' 'We can play.' 'The dog is here.' 'Sam can hop.' Repeat sentence structures across pages with one word changing. High-frequency sight words (Dolch Pre-Primer + Primer) plus simple decodable words; reuse the same sight words throughout so the book teaches them. NO two pages may have identical text. ONE action per page. Present tense. No commas, no dialogue, no contractions. EXCEPTION: the book's main topic word (like dinosaur or princess) is allowed even if long — repetition and the pictures teach it.

**Growing Reader** (Levels 3–4) — 4–10 words per page:

> Exactly ONE sentence per page, 4-10 words. Still predictable and patterned, but with a fuller story arc and a few new words a growing reader can decode from context. Mostly one- and two-syllable words. NO two pages may have identical text. ONE action per page. Simple connectors allowed (and, but, so). Present tense. No dialogue longer than three words. EXCEPTION: the book's main topic word is allowed even if long — repetition and the pictures teach it.

Behind these, hard numeric limits also apply per level (words per page, average word length, share of pages that must include the child's name, whether commas/contractions/dialogue are allowed).

## 5. Phonics scope (injected, and mechanically enforced)

*Source: `lib/reading/phonics.ts` → `describePhonicsScope`. Built from a 10-level grapheme scope-and-sequence; the same scope powers the checker that rejects off-scope words.*

The prompt lists exactly which letter-sounds are allowed (everything up to the level's "ceiling") and names the untaught patterns to avoid. The scope-and-sequence:

| Level | Adds |
|------|------|
| 1 | short a, single consonants |
| 2 | short i, short o |
| 3 | short e, short u (all five short vowels) + two-consonant blends (st, tr, mp, nd) |
| 4 | consonant digraphs sh, ch, th, wh, ck |
| 5 | endings -ng / -ing |
| 6 | magic-e long vowels (cake, ride, home, cute) |
| 7 | vowel teams ai, ay, ee, ea, oa, ow, igh (rain, feet, boat, night) |
| 8 | r-controlled vowels ar, or, er, ir, ur (car, fork, bird) |
| 9 | diphthongs oi, oy, ou, ow, oo, aw, au (coin, moon, saw) |
| 10 | longer multi-syllable words, soft c/g, common prefixes/suffixes |

Tiny caps at level 3, Beginner at 6, Growing is "none" (softer guidance rather than a hard grapheme gate). The child's name, taught sight words, and the book's topic word are always exempt.

## 6. Story plan (injected — the variety engine)

*Source: `lib/reading/storySystem.ts` → `pickCombination` + `describePlan`. A fresh combination is chosen per book and required to differ from the child's recent books on at least 3 of 5 axes.*

The model is told to build the book around a specific, randomly-chosen combination of:

- **Template (structure):** Journey to a Goal · Try, Try Again · Discovery · Someone Needs Help — each with its own beat sheet.
- **Arc / feeling:** Adventure · Funny · Friendly Contest · Little Mystery · Discovery · Helping · Learning a Skill · Cozy and Calm.
- **Setting:** backyard, park, home, forest, beach, museum, busy street, mountain, snowy day, river, farm, playground, campsite, garden.
- **Objective:** find something · build something · learn a skill · help someone · celebrate · explore · solve a small puzzle.
- **Tone:** funny · curious · exciting · proud · gentle · brave · cheerful.

It also enforces the **Four Questions** spine (who / what / why / how) and this rule: *"The CHILD succeeds through their own effort, kindness, or cleverness — never luck, coincidence, or an adult taking over,"* with the "how" foreshadowed earlier, one problem, resolved warmly.

---

## 7. Grade prompt — the quality gate

*Source: `lib/story.ts` → `buildGradePrompt`. Re-reads the draft strictly and returns `{pass, score, issues[], praise}`.*

It re-states the level rules and phonics scope, then verifies: (1) the child can actually decode every page at this exact level; (2) repetition & predictability like BOB Books; (3) the child is the hero and the ordered details genuinely shape the story; (4) a clean arc (intro → discovery → activity → small challenge → success → celebration); (5) illustration directions are concrete, consistent, and text/brand-free with a cast entry for every recurring character; (6) safety & rights (positive, nothing scary, no trademarks).

## 8. Revise prompt

*Source: `lib/story.ts` → `buildRevisePrompt`.* Feeds the numbered issues back with the current draft and the same hard level rules, asking for the full corrected JSON while keeping what works (and preserving the story plan and any parent read-along lines).

---

## Related: illustration instructions

Story development produces the per-page `artPrompt`. Turning those into finished art is a separate stage with its own prompts — `buildArtDirectionPrompt` (`lib/story.ts`) expands each one-line scene into print-safe art direction, and `BRAND_ART_STYLE` (`lib/brand.ts`) sets the house illustration look prepended to every image. Ask if you'd like that stack written up too.
