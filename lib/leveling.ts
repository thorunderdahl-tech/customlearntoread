// Reading-level rubric — the "meet the reader where they are" rulebook.
// Three parent-friendly levels (Tiny / Beginner / Growing Reader) per the
// master book-generation prompt. Order-form mapping: Level 1 -> tiny,
// Level 2 -> beginner, Level 3/4 -> growing, "Not sure" -> by age.
// Books are BOB-Books-like: ONE sentence per page, pictures carry the story.

import { phonicsDecodable, wordMaxLevel } from "./reading/phonics";

export type LevelId = "tiny" | "beginner" | "growing";

export interface LevelRules {
  sentencesPerPage: [number, number];
  minWordsPerPage: number;
  maxWordsPerPage: number;
  maxAvgWordLength: number; // average characters per word, child's name excluded
  nameOnPageShare: number; // fraction of pages that must include the child's name
  allowCommas: boolean;
  allowContractions: boolean;
  allowDialogue: boolean;
  decodability: "strict" | "moderate" | "none"; // sight-word/CVC vocabulary gate
  // Highest phonics grapheme level (1-10, see lib/reading/phonics.ts) a word may
  // require to still count as "decodable" at this level. Drives the systematic
  // grapheme check. Omitted when decodability is "none".
  phonicsCeiling?: number;
  // Grapheme level at which THIS level's new focus begins (words needing >= this
  // are "new-focus"; words below are "review"). Drives the soft cumulative-review
  // and practices-own-level checks. Omitted for the first level (nothing to review).
  newFocusFrom?: number;
  // Sight-word teaching set (Level 1): the book's core vocabulary — excluding
  // names and topic words — must be this many DISTINCT words, drawn from the
  // Dolch Pre-Primer list (with limited flexibility), each reused across pages.
  sightWordBudget?: [number, number];
  sightWordFlex?: number; // how many core words may come from outside Pre-Primer (Primer/CVC)
}

export interface Level {
  id: LevelId;
  parentLabel: string;
  formPrefixes: string[];
  rules: LevelRules;
  promptRules: string;
}

export const LEVELS: Level[] = [
  {
    id: "tiny",
    parentLabel: "Tiny Reader",
    formPrefixes: ["Level 1"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 1, maxWordsPerPage: 3, maxAvgWordLength: 4.0, nameOnPageShare: 0.5, allowCommas: false, allowContractions: false, allowDialogue: false, decodability: "strict", phonicsCeiling: 3, sightWordBudget: [8, 10], sightWordFlex: 2 },
    promptRules:
      "This book TEACHES a sight-word set, like BOB Books and Scholastic Sight Word Readers. FIRST choose the book's teaching set: 8-10 different words from the Dolch Pre-Primer list ONLY: a, and, away, big, blue, can, come, down, find, for, funny, go, help, here, I, in, is, it, jump, little, look, make, me, my, not, one, play, red, run, said, see, the, three, to, two, up, we, where, yellow, you. At most 2 of the 8-10 may instead be short phonetic CVC words (like hop, sit, nap) if the story needs an action word. THEN write every page using ONLY: that teaching set + the child's name + the book's topic word(s) (like dinosaur — repetition and pictures teach those). Reuse every teaching word on multiple pages — a word used once teaches nothing. Exactly ONE tiny sentence or label per page, 1-3 words (e.g. 'A cat.', 'Sam hops.', 'Big dog!'). Use a few (2-3) simple sentence frames and ROTATE them — never use the same frame on more than two pages in a row (e.g. 'Sam sees a ball.' 'Sam sees a bat.' is fine twice, then switch to a different frame like 'Sam can run!'). Reuse the teaching words throughout the book, but SPREAD them out — sprinkle repeated words across the story rather than stacking near-identical pages. NO two pages may have identical text. Present tense. No commas, no dialogue.",
  },
  {
    id: "beginner",
    parentLabel: "Beginner Reader",
    formPrefixes: ["Level 2"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 3, maxWordsPerPage: 6, maxAvgWordLength: 4.4, nameOnPageShare: 0.5, allowCommas: false, allowContractions: false, allowDialogue: false, decodability: "moderate", phonicsCeiling: 6, newFocusFrom: 4 },
    promptRules:
      "Exactly ONE sentence per page, 3-6 words, like early BOB Books: 'I see a cat.' 'I can run.' 'We can play.' 'The dog is here.' 'Sam can hop.' Use a few simple sentence structures and ROTATE them — the same structure may run at most two pages in a row before you switch to a different one (e.g. 'I see a cat.' 'I see a dog.' then change to 'The dog can run.'). High-frequency sight words (Dolch Pre-Primer + Primer) plus simple decodable words; reuse the same sight words throughout so the book teaches them, but SPREAD the repetition across the book rather than repeating the same frame page after page. NO two pages may have identical text. ONE action per page. Present tense. No commas, no dialogue, no contractions. EXCEPTION: the book's main topic word (like dinosaur or princess) is allowed even if long — repetition and the pictures teach it.",
  },
  {
    id: "growing",
    parentLabel: "Growing Reader",
    formPrefixes: ["Level 3", "Level 4"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 4, maxWordsPerPage: 10, maxAvgWordLength: 5.0, nameOnPageShare: 0.4, allowCommas: false, allowContractions: false, allowDialogue: true, decodability: "none", newFocusFrom: 7 },
    promptRules:
      "Exactly ONE sentence per page, 4-10 words. Still predictable and patterned, but with a fuller story arc and a few new words a growing reader can decode from context. Vary the sentence structure so no single frame runs more than two pages in a row; reuse key words across the book but sprinkle them throughout rather than repeating near-identical pages. Mostly one- and two-syllable words. NO two pages may have identical text. ONE action per page. Simple connectors allowed (and, but, so). Present tense. No dialogue longer than three words. EXCEPTION: the book's main topic word is allowed even if long — repetition and the pictures teach it.",
  },
];

/** Resolve the order form's reading_level text (or 'Not sure') to a Level. */
export function resolveLevel(formValue: string | undefined, age?: string | number): Level {
  const v = (formValue || "").trim();
  for (const lvl of LEVELS) if (lvl.formPrefixes.some((p) => v.startsWith(p))) return lvl;
  const n = typeof age === "number" ? age : parseInt(String(age || ""), 10);
  if (!Number.isFinite(n) || n <= 4) return LEVELS[0];
  if (n <= 6) return LEVELS[1];
  return LEVELS[2];
}

export interface StoryPage {
  n: number;
  text: string;
  artPrompt: string;
  adultLine?: string; // optional grown-up read-aloud line (Parent Read-Along Lines)
}
export interface StoryDraft {
  title: string;
  levelId: LevelId;
  childName: string;
  characterDescription: string;
  companionDescription?: string; // legacy single-companion lock (superseded by castDescriptions)
  castDescriptions?: string[]; // appearance lock for EVERY recurring character other than the hero
  coverArtPrompt: string;
  pages: StoryPage[];
  // Story-system layer (see lib/reading/storySystem.ts).
  fourQuestions?: { who: string; what: string; why: string; how: string };
  combination?: { key: string; template: string; arc: string; setting: string; tone: string; objective: string };
}

export interface CheckResult {
  pass: boolean;
  problems: string[];
  warnings: string[]; // soft, non-blocking (cumulative review, practices-own-level)
  stats: { totalWords: number; pages: number; uniqueWords: number };
}

const sentenceSplit = (t: string) => t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");
const words = (t: string) => t.split(/\s+/).map((w) => w.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);

// ---- decodability vocabulary (see docs/reading-levels.md) ----
// Dolch Pre-Primer list (40 words) — the Level 1 (Tiny Reader) teaching vocabulary.
export const PRE_PRIMER = new Set("a and away big blue can come down find for funny go help here i in is it jump little look make me my not one play red run said see the three to two up we where yellow you".split(" "));
// Dolch Primer + color words — the "some flexibility" tier and Beginner vocabulary.
const PRIMER = new Set(("all am are at ate be black brown but came did do eat four get good have he into like must new no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes " +
  "orange purple pink green gray").split(" "));
const SIGHT_CORE = new Set([...PRE_PRIMER, ...PRIMER]);
// Dolch first-grade + common Dolch nouns — the "moderate" extension.
const SIGHT_EXTENDED = new Set(("after again an any as ask by could every fly from give going had has her him his how just know let live may of old once open over put round some stop take thank them then think walk were when " +
  "apple baby ball bear bed bird boat book box boy bus cake car cat chair cow day dog door duck egg eye farm fish frog fun game girl goat hat hen hill home horse house kitten leg man men milk moon morning mother name nest night pig rain ring school seed sheep shoe snow song stick street sun table thing time top toy tree water way wind window wood").split(" "));

/** The phonics ceiling used when scoring a word against a level. Falls back to a
 * sensible default when a level omits phonicsCeiling. */
function ceilingFor(r: LevelRules): number {
  return r.phonicsCeiling ?? (r.decodability === "strict" ? 3 : 6);
}

/** Can the child read this word at this level? A word fits if it's a taught
 * high-frequency (sight/heart) word OR it is systematically decodable using
 * graphemes up to the level's phonics ceiling (lib/reading/phonics.ts).
 * The grapheme engine replaces the old CVC/CVCe heuristic, so blends, digraphs,
 * vowel teams and r-controlled vowels are scored correctly. */
function wordFitsLevel(w: string, r: LevelRules): boolean {
  const mode = r.decodability;
  if (mode === "none") return true;
  if (SIGHT_CORE.has(w)) return true;
  const ceiling = ceilingFor(r);
  if (mode === "strict") return phonicsDecodable(w, ceiling);
  // moderate: also allow the extended Dolch sight set and -s forms of sight words.
  if (SIGHT_EXTENDED.has(w) || phonicsDecodable(w, ceiling)) return true;
  if (w.endsWith("s") && w.length > 2) {
    const stem = w.slice(0, -1);
    if (SIGHT_CORE.has(stem) || SIGHT_EXTENDED.has(stem)) return true;
  }
  return false;
}

const MAX_TOPIC_EXEMPTIONS = 2; // only the book's real topic words get a free pass, not every repeated hard word
const CONTRACTION_RE = /\w(n['’]t|['’](ll|re|ve|m|d))\b/i; // possessive 's is fine and deliberately not flagged

/** Deterministic rubric check — QA gate #1 (pure code, no AI judgment). */
export function checkStory(draft: StoryDraft, level: Level): CheckResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  const r = level.rules;
  const nameNorm = norm(draft.childName || "");
  let totalWords = 0;
  let pagesWithName = 0;
  const vocab = new Set<string>();

  if (!draft.pages?.length) problems.push("Story has no pages.");

  // Proper-noun allowance: recurring cast names (friend, pet — e.g. "Mateo",
  // "Pip") read like the child's own name: taught by the pictures. A word is
  // treated as a name if EVERY occurrence is capitalized and it appears on 2+ pages.
  const caseSeen = new Map<string, { cap: number; lower: number; pages: Set<number> }>();
  draft.pages?.forEach((p) => {
    p.text.split(/\s+/).forEach((raw) => {
      const cleaned = raw.replace(/[^A-Za-z'’-]/g, "");
      if (!cleaned) return;
      const w = norm(cleaned);
      const rec = caseSeen.get(w) || { cap: 0, lower: 0, pages: new Set<number>() };
      if (/^[A-Z]/.test(cleaned)) rec.cap++; else rec.lower++;
      rec.pages.add(p.n);
      caseSeen.set(w, rec);
    });
  });
  const castNames = new Set([...caseSeen].filter(([, r]) => r.lower === 0 && r.cap > 0 && r.pages.size >= 2).map(([w]) => w));

  // Topic-word allowance: a word repeated on 3+ pages is being taught by
  // repetition and pictures (BOB-Books style), so it is exempt from length and
  // decodability rules (e.g. "dinosaur") — but capped at the top
  // MAX_TOPIC_EXEMPTIONS words so repetition can't launder a whole hard vocabulary.
  const pageOccurrences = new Map<string, number>();
  draft.pages?.forEach((p) => {
    new Set(words(p.text).map(norm)).forEach((w) => pageOccurrences.set(w, (pageOccurrences.get(w) || 0) + 1));
  });
  const topicWords = new Set(
    [...pageOccurrences]
      .filter(([w, n]) => n >= 3 && w !== nameNorm && (r.decodability === "none" ? w.length > r.maxAvgWordLength : !wordFitsLevel(w, r)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOPIC_EXEMPTIONS)
      .map(([w]) => w),
  );

  draft.pages?.forEach((p) => {
    const ws = words(p.text);
    totalWords += ws.length;
    ws.forEach((w) => vocab.add(norm(w)));
    const sentences = sentenceSplit(p.text);
    if (sentences.length < r.sentencesPerPage[0] || sentences.length > r.sentencesPerPage[1])
      problems.push(`Page ${p.n}: ${sentences.length} sentence(s) — this level requires exactly ${r.sentencesPerPage[1] === r.sentencesPerPage[0] ? r.sentencesPerPage[0] : r.sentencesPerPage.join("-")} per page.`);
    if (ws.length > r.maxWordsPerPage || ws.length < r.minWordsPerPage)
      problems.push(`Page ${p.n}: ${ws.length} words — level allows ${r.minWordsPerPage}-${r.maxWordsPerPage}.`);
    const nonName = ws.filter((w) => norm(w) !== nameNorm && !topicWords.has(norm(w)) && !castNames.has(norm(w)));
    if (nonName.length) {
      const avg = nonName.reduce((a, w) => a + w.length, 0) / nonName.length;
      if (avg > r.maxAvgWordLength)
        problems.push(`Page ${p.n}: average word length ${avg.toFixed(1)} — max ${r.maxAvgWordLength} for this level.`);
    }
    // Punctuation / dialogue / contraction rules (previously prompt-only).
    if (!r.allowCommas && p.text.includes(","))
      problems.push(`Page ${p.n}: contains a comma — not allowed at this level.`);
    if (!r.allowDialogue && /["“”]/.test(p.text))
      problems.push(`Page ${p.n}: contains dialogue/quotation marks — not allowed at this level.`);
    if (!r.allowContractions && CONTRACTION_RE.test(p.text))
      problems.push(`Page ${p.n}: contains a contraction — not allowed at this level.`);
    // Decodability: every word must be readable at this level.
    if (r.decodability !== "none") {
      const hard = [...new Set(ws.map(norm))].filter(
        (w) => w && w !== nameNorm && !topicWords.has(w) && !castNames.has(w) && !wordFitsLevel(w, r),
      );
      if (hard.length)
        problems.push(`Page ${p.n}: word(s) the child can't decode at this level: ${hard.join(", ")} — swap for sight words or short phonetic words.`);
    }
    if (nameNorm && p.text.split(/\s+/).some((w) => norm(w) === nameNorm)) pagesWithName++;
    if (!p.artPrompt || p.artPrompt.length < 20) problems.push(`Page ${p.n}: illustration direction missing or too thin.`);
  });

  // No two pages in a book may have identical text — every page must teach.
  const seenText = new Map<string, number>();
  draft.pages?.forEach((p) => {
    const key = words(p.text).map(norm).join(" ");
    if (!key) return;
    const firstPage = seenText.get(key);
    if (firstPage !== undefined) problems.push(`Page ${p.n}: identical text to page ${firstPage} ("${p.text.trim()}") — no two pages may repeat the same sentence.`);
    else seenText.set(key, p.n);
  });

  // Level 1 sight-word teaching set (BOB Books / Scholastic Sight Word Readers
  // model): the book's core vocabulary — everything except the child's name,
  // cast names, and topic words — must be a deliberate set of 8-10 words drawn
  // from the Dolch Pre-Primer list (up to sightWordFlex from Primer/CVC), and
  // each word should be REUSED across pages so the book actually teaches it.
  if (r.sightWordBudget && draft.pages?.length) {
    const [minSet, maxSet] = r.sightWordBudget;
    const flex = r.sightWordFlex ?? 2;
    const corePages = new Map<string, Set<number>>(); // core word -> pages it appears on
    draft.pages.forEach((p) => {
      words(p.text).map(norm).forEach((w) => {
        if (!w || w === nameNorm || topicWords.has(w) || castNames.has(w)) return;
        if (!corePages.has(w)) corePages.set(w, new Set());
        corePages.get(w)!.add(p.n);
      });
    });
    const core = [...corePages.keys()];
    if (core.length > maxSet)
      problems.push(`Sight-word set: the book uses ${core.length} different core words (${core.join(", ")}) — a Tiny Reader book teaches a set of ${minSet}-${maxSet}. Reuse words instead of adding new ones.`);
    if (core.length < minSet)
      problems.push(`Sight-word set: only ${core.length} different core words — aim for ${minSet}-${maxSet} so the book teaches a full set.`);
    const offList = core.filter((w) => !PRE_PRIMER.has(w));
    const offListBad = offList.filter((w) => !PRIMER.has(w) && !phonicsDecodable(w, 3));
    if (offListBad.length)
      problems.push(`Sight-word set: not Pre-Primer Dolch words and not simple phonetic words: ${offListBad.join(", ")} — replace with words from the Pre-Primer list.`);
    if (offList.length > flex)
      problems.push(`Sight-word set: ${offList.length} core words are outside the Pre-Primer Dolch list (${offList.join(", ")}) — at most ${flex} allowed; swap the rest for Pre-Primer words.`);
    const singleUse = core.filter((w) => corePages.get(w)!.size < 2);
    if (singleUse.length > 2)
      problems.push(`Sight-word reuse: ${singleUse.length} words appear on only one page (${singleUse.join(", ")}) — reuse each teaching word on multiple pages so the child learns it.`);
  }

  // The title must be readable by the child too (name + topic words are fine).
  if (draft.title && r.decodability !== "none") {
    const hardTitle = [...new Set(words(draft.title).map(norm))].filter(
      (w) => w && w !== nameNorm && !topicWords.has(w) && !castNames.has(w) && !wordFitsLevel(w, { ...r, decodability: "moderate", phonicsCeiling: 6 }),
    );
    if (hardTitle.length)
      problems.push(`Title: word(s) too hard for this level: ${hardTitle.join(", ")}.`);
  }

  if (draft.pages?.length && nameNorm) {
    const share = pagesWithName / draft.pages.length;
    if (share < r.nameOnPageShare)
      problems.push(`Child's name appears on ${Math.round(share * 100)}% of pages — needs ≥ ${Math.round(r.nameOnPageShare * 100)}% (the child is the hero).`);
  }
  if (!draft.title) problems.push("Missing title.");
  if (!draft.coverArtPrompt) problems.push("Missing cover illustration direction.");

  // Four-questions spine: every book must answer who / what / why / how so the
  // story has a goal and a reason, not just "things happen."
  const fq = draft.fourQuestions;
  if (!fq || !fq.who?.trim() || !fq.what?.trim() || !fq.why?.trim() || !fq.how?.trim())
    problems.push("Missing the four-questions spine (who / what / why / how) — fill the fourQuestions field so the book has a clear goal, reason, and resolution.");

  // Soft reading checks (warnings, never block): does the book both REVIEW earlier
  // patterns and PRACTICE its own level's new focus? Uses the grapheme engine.
  if (r.newFocusFrom) {
    let decodable = 0, below = 0;
    const focusWords = new Set<string>();
    draft.pages?.forEach((p) => {
      words(p.text).forEach((raw) => {
        const w = norm(raw);
        if (!w || w === nameNorm || castNames.has(w) || topicWords.has(w)) return;
        if (SIGHT_CORE.has(w)) return; // core Dolch sight words aren't phonics-decoding practice
        const ml = wordMaxLevel(w);
        if (ml == null) return; // not phonically decodable — handled by sight-word rules
        decodable++;
        if (ml < r.newFocusFrom!) below++;
        else focusWords.add(w);
      });
    });
    if (decodable > 0) {
      const reviewRatio = below / decodable;
      if (reviewRatio < 0.4)
        warnings.push(`Cumulative review: only ${Math.round(reviewRatio * 100)}% of decodable words review earlier (below-level) patterns — aim for ≥40% familiar words so the book reinforces, not just introduces.`);
      if (focusWords.size < 2)
        warnings.push(`Practices its level: only ${focusWords.size} word(s) use this level's new patterns — include at least 2 so the book actually teaches its level, not just reviews.`);
    }
  }

  // Sentence-frame variety (soft): repetition teaches, but the same frame — same
  // length, differing in at most one word slot — should not run more than two pages
  // in a row. "X saw a ball / Y saw a ball / Z saw a ball" page after page reads flat.
  {
    const pp = draft.pages ?? [];
    const sameFrame = (a: string, b: string) => {
      const wa = words(a).map(norm), wb = words(b).map(norm);
      if (!wa.length || wa.length !== wb.length) return false;
      let diff = 0;
      for (let i = 0; i < wa.length; i++) if (wa[i] !== wb[i]) diff++;
      return diff <= 1;
    };
    let start = 0;
    for (let i = 1; i <= pp.length; i++) {
      if (i < pp.length && sameFrame(pp[i - 1].text, pp[i].text)) continue;
      if (i - start >= 3)
        warnings.push(`Sentence-frame variety: pages ${pp[start].n}-${pp[i - 1].n} (${i - start} in a row) reuse the same sentence frame with one word changing — rotate structures so no frame runs more than two pages before switching.`);
      start = i;
    }
  }

  return {
    pass: problems.length === 0,
    problems,
    warnings,
    stats: { totalWords, pages: draft.pages?.length || 0, uniqueWords: vocab.size },
  };
}
