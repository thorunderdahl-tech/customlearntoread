// Reading-level rubric — the "meet the reader where they are" rulebook.
// Four parent-friendly levels (Tiny / Beginner / Growing / Confident Reader)
// per the master book-generation prompt. Order-form mapping: Level 1 -> tiny,
// Level 2 -> beginner, Level 3 -> growing, Level 4 -> confident,
// "Not sure" -> by age.
// The earliest books are BOB-Books-like: ONE sentence per page, pictures carry
// the story; the top level opens up to short paragraphs and richer language.

import { phonicsDecodable, wordMaxLevel } from "./reading/phonics";

export type LevelId = "tiny" | "beginner" | "growing" | "confident";

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
  // Highest heart-word / high-frequency intro level (1-10, see HEART_WORD_TABLE) a
  // book at this level may use before the word is decodable. Grows with the level.
  heartCeiling?: number;
  // Grapheme level at which THIS level's new focus begins (words needing >= this
  // are "new-focus"; words below are "review"). Drives the soft cumulative-review
  // and practices-own-level checks. Omitted for the first level (nothing to review).
  newFocusFrom?: number;
  // Core teaching-word budget (Levels 1-2): the book's core vocabulary — excluding
  // names and topic words — must be this many DISTINCT words (phonics-first:
  // decodable words + level-appropriate heart words), each reused across pages.
  sightWordBudget?: [number, number]; // total distinct core-word teaching set (pattern + story words)
  sightWordFlex?: number; // how many core words may come from outside Pre-Primer (Primer/CVC)
  // Story-arc vocabulary split (see checkStory). Of the distinct core words, at
  // least `patternMin` must REPEAT (appear on 2+ pages) to form the practiced
  // backbone the child drills; up to `storyWordMax` may be "story words" that
  // appear on a single page to carry one plot beat (the problem, the search, the
  // find) — this is what turns a word list into a real little story.
  patternMin?: number;
  storyWordMax?: number;
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
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 1, maxWordsPerPage: 3, maxAvgWordLength: 4.5, nameOnPageShare: 0.5, allowCommas: false, allowContractions: false, allowDialogue: false, decodability: "strict", phonicsCeiling: 3, heartCeiling: 2, sightWordBudget: [12, 15], patternMin: 8, storyWordMax: 5 },
    promptRules:
      "This book TEACHES a phonics-first backbone AND tells a real little story — decodable-reader meets a simple story arc — across about 16 pages. VOCABULARY (phonics-first): build the book from short, decodable words the child can sound out (short-vowel CVC and simple words: cat, Sam, run, hop, big, red, sit, dog, sun, bug, jump, nest) PLUS a small set of HEART WORDS — common words taught before they are decodable, learned by sounding out the regular parts and remembering the tricky part: I, the, a, is, to, see, my, look, we, go, and, you, he, she, play, down, now. PREFER words the child can SOUND OUT — reach for a heart word only when a decodable one won't fit, so the child gets as much phonics practice as possible. Do NOT use words that need vowel teams, diphthongs or other patterns a brand-new reader hasn't met (avoid: with, that, want, saw, out, where, said — these come at higher levels). Choose about 12-15 different words total. At least 8 are PATTERN words you REUSE across many pages (the practiced backbone), and up to 5 may be STORY words used on just ONE page to carry a single plot beat (the thing is lost, the search, the find). TOPIC CLUSTER: on top of that you may use the book's main topic word PLUS up to 2 related theme words (e.g. hockey + puck + goal, or princess + crown + castle) — repetition and the pictures teach those. Plus the child's name. PAGES: exactly ONE tiny sentence or label per page, 1-3 words (e.g. 'A cat.', 'Sam hops.', 'Big dog!'). STORY ARC — the pages must walk a real arc IN ORDER: meet the child, the goal/object appears, play and build, a small problem, the search, the find, a happy ending. Each page ADVANCES the story — no page could be shuffled or removed. Use one strong repeating sentence pattern with one slot changing to move the story forward. NO two pages may have identical text. Present tense. No commas, no dialogue.",
  },
  {
    id: "beginner",
    parentLabel: "Beginner Reader",
    formPrefixes: ["Level 2"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 3, maxWordsPerPage: 6, maxAvgWordLength: 4.4, nameOnPageShare: 0.5, allowCommas: false, allowContractions: false, allowDialogue: false, decodability: "moderate", phonicsCeiling: 6, heartCeiling: 4, newFocusFrom: 4, sightWordBudget: [18, 30], patternMin: 12, storyWordMax: 8 },
    promptRules:
      "This book TEACHES a phonics-first backbone AND tells a real little story — early decodable-reader with a simple story arc — across about 16 pages. Exactly ONE sentence per page, 3-6 words: 'Sam sees a big cat.' 'Sam can run fast.' 'We can play in the sun.' VOCABULARY (phonics-first): build the book from decodable words the child can sound out — short vowels, consonant blends and digraphs (sh, ch, th, ck), and simple magic-e words — PLUS a set of HEART / high-frequency words taught before they are decodable, learned by sounding out the regular parts and remembering the tricky part: I, the, a, is, to, see, my, look, we, like, go, and, you, he, she, play, down, now, me, was, are, for, of, they, have, out, saw, said, do, what, come, some, put, want, how. PREFER words the child can SOUND OUT — reach for a heart word only when a decodable one won't fit, so the child gets as much phonics practice as possible. Choose about 18-30 different words total. At least 12 are PATTERN words you REUSE across many pages (the practiced backbone), and up to 8 may be STORY words used on just ONE page to carry a plot beat (the problem, the search, the find). TOPIC CLUSTER: on top of that you may use the book's main topic word PLUS up to 2 related theme words (e.g. soccer + ball + goal, or dinosaur + egg + nest), plus the child's name. STORY ARC — the pages must walk a real arc IN ORDER: meet the child, the goal/object appears, play and build, a small problem, the search, the find, a happy ending. Each page ADVANCES the story — no page could be shuffled or removed. Repeat sentence structures across pages with one or two words changing so the book stays predictable and teaches its words. NO two pages may have identical text. ONE action per page. Present tense. No commas, no dialogue, no contractions. EXCEPTION: the book's topic/theme words are allowed even if long — repetition and the pictures teach them.",
  },
  {
    id: "growing",
    parentLabel: "Growing Reader",
    formPrefixes: ["Level 3"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 4, maxWordsPerPage: 10, maxAvgWordLength: 5.0, nameOnPageShare: 0.4, allowCommas: false, allowContractions: false, allowDialogue: true, decodability: "moderate", phonicsCeiling: 8, heartCeiling: 7, newFocusFrom: 7 },
    promptRules:
      "This book TEACHES a growing reader AND tells a real story — a fuller decodable-reader arc — across about 16 pages. Exactly ONE sentence per page, 4-10 words: 'Sam runs down the green hill.' 'The dog sees a big fish.' 'Sam and Max play in the rain.' VOCABULARY (phonics-first, broader): use words a growing reader can decode — short vowels, blends, digraphs, magic-e, and now VOWEL TEAMS (rain, feet, boat, see) and R-CONTROLLED vowels (car, bird, park, corner), mostly one- and two-syllable words — PLUS heart / high-frequency words taught by heart. PREFER words the child can SOUND OUT — reach for a heart word only when a decodable one won't fit, so the child keeps building phonics. Reuse key words so the book reinforces them, and include a few of this level's new patterns (vowel teams, r-controlled) to practice. TOPIC CLUSTER: the book's main topic word PLUS up to 2 related theme words, and the child's name, may appear even if long — repetition and the pictures teach them. STORY ARC — the pages must walk a real arc IN ORDER: meet the child, the goal appears, build through the middle, a small problem about two-thirds in, then a clear happy resolution on the last pages. Each page ADVANCES the story — no page could be shuffled or removed. Simple connectors allowed (and, but, so). Short dialogue allowed (no more than three words). NO two pages may have identical text. ONE action per page. Present tense. No commas, no contractions.",
  },
  {
    id: "confident",
    parentLabel: "Confident Reader",
    formPrefixes: ["Level 4"],
    rules: { sentencesPerPage: [1, 2], minWordsPerPage: 6, maxWordsPerPage: 14, maxAvgWordLength: 5.5, nameOnPageShare: 0.3, allowCommas: true, allowContractions: true, allowDialogue: true, decodability: "none", heartCeiling: 10, newFocusFrom: 9 },
    promptRules:
      "This book is for a CONFIDENT early reader — a real little story that reads like a first easy-reader chapter, across about 16 pages. ONE or TWO sentences per page — a short paragraph, 6-14 words total: 'Sam kicked the ball down the hill and laughed.' 'The dog ran after it. Sam could not catch up!' VOCABULARY (open / authentic): by this level the decodable scaffolding comes off — use natural, expressive vocabulary a confident reader can decode or work out from context and the pictures, mostly one- and two-syllable words with a few richer ones. Commas, contractions, and dialogue are allowed. STORY ARC — the pages must walk a real arc IN ORDER: meet the child and their goal, build through the middle, a real problem about two-thirds in, then a satisfying, happy resolution on the final pages. Each page ADVANCES the story — no page could be shuffled or removed. Vary sentence structure so the writing feels natural, not templated. Present OR simple past tense (stay consistent within a book). NO two pages may have identical text. EXCEPTION: the book's topic/theme words are always fine.",
  },
];

/** Resolve the order form's reading_level text (or 'Not sure') to a Level. */
export function resolveLevel(formValue: string | undefined, age?: string | number): Level {
  const v = (formValue || "").trim();
  for (const lvl of LEVELS) if (lvl.formPrefixes.some((p) => v.startsWith(p))) return lvl;
  const n = typeof age === "number" ? age : parseInt(String(age || ""), 10);
  if (!Number.isFinite(n) || n <= 4) return LEVELS[0]; // tiny
  if (n <= 6) return LEVELS[1]; // beginner
  if (n <= 8) return LEVELS[2]; // growing
  return LEVELS[3]; // confident
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

// Strip quotation marks before counting so a line ending in !" or ." isn't counted
// as an extra (empty-but-for-a-quote) sentence.
const sentenceSplit = (t: string) => t.split(/[.!?]+/).map((s) => s.replace(/[“”"]/g, "").trim()).filter(Boolean);
const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");
const words = (t: string) => t.split(/\s+/).map((w) => w.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);

// ---- high-frequency / heart-word vocabulary ----
// Aligned to reading-system-foundation/schemas/heart-words.json (NOT Dolch). These
// are high-frequency words a child may read before the phonics engine can decode
// them. A TRUE heart word is irregular — the child decodes the regular parts and
// learns only the "tricky" grapheme by heart (the=/th/+tricky e; was=/w/+tricky
// a,s). "Regular" high-frequency words (see, look, play, from) are decodable at a
// higher level but are so useful they're introduced early, exactly as the schema
// marks them. Everything NOT here is gated purely by decodability (lib/reading/
// phonics.ts) — so the vocabulary is phonics-first, not a whole-word sight list.
// [word, introLevel (1-10 master scope), isTrueHeartWord].
const HEART_WORD_TABLE: [string, number, boolean][] = [
  ["I", 1, true], ["the", 1, true], ["a", 1, true], ["is", 1, true], ["to", 1, true], ["see", 1, false], ["my", 1, true], ["look", 1, false],
  ["we", 2, true], ["like", 2, false], ["go", 2, true], ["and", 2, false], ["you", 2, true], ["he", 2, true], ["she", 2, true], ["play", 2, false], ["down", 2, false], ["now", 2, false],
  ["me", 3, true], ["was", 3, true], ["are", 3, true], ["for", 3, false], ["of", 3, true], ["they", 3, true], ["have", 3, true], ["out", 3, false], ["saw", 3, false],
  ["said", 4, true], ["do", 4, true], ["what", 4, true], ["come", 4, true], ["some", 4, true], ["put", 4, true], ["want", 4, true], ["how", 4, false],
  ["here", 5, false], ["there", 5, true], ["where", 5, true], ["one", 5, true], ["two", 5, true], ["good", 5, false], ["too", 5, false], ["school", 5, false],
  ["your", 6, true], ["our", 6, true], ["from", 6, false], ["or", 6, false], ["by", 6, true],
  ["could", 7, true], ["would", 7, true], ["should", 7, true], ["been", 7, false], ["who", 7, true],
  ["many", 8, true], ["any", 8, true], ["again", 8, true], ["once", 8, true], ["their", 8, true],
  ["because", 9, true], ["people", 9, true], ["other", 9, true], ["only", 9, false], ["through", 9, true],
  ["thought", 10, true], ["enough", 10, true], ["does", 10, true], ["done", 10, true], ["another", 10, true],
];
const HEART_LEVEL = new Map<string, number>(HEART_WORD_TABLE.map(([w, l]) => [w, l]));
const TRUE_HEART = new Set<string>(HEART_WORD_TABLE.filter(([, , h]) => h).map(([w]) => w));

/** Is this a genuinely irregular "heart" word (decode the regular parts, learn the
 * tricky grapheme by heart)? Used to split the "Words in This Book" list into
 * sound-out words vs. heart words. */
export function isHeartWord(w: string): boolean {
  return TRUE_HEART.has(w.toLowerCase().replace(/[^a-z]/g, ""));
}

/** For the "Words in This Book" page: is a word one the child SOUNDS OUT at this
 * level (decodable within the level's phonics scope), or one they read BY HEART
 * (a high-frequency / heart word)? We err toward BY HEART: any word on the
 * high-frequency / heart-word list is labeled by-heart even when the engine could
 * technically decode it, so the "sound out" list contains only true phonics words. */
export function wordKind(w: string, level: Level): "sound-out" | "heart" {
  const n = w.toLowerCase().replace(/[^a-z]/g, "");
  if (HEART_LEVEL.has(n)) return "heart";
  return phonicsDecodable(n, ceilingFor(level.rules)) ? "sound-out" : "heart";
}

/** A high-frequency word this level may use before it is fully decodable: a heart
 * word (or early-introduced regular HF word) whose intro level is within reach. */
function heartFits(w: string, r: LevelRules): boolean {
  const lvl = HEART_LEVEL.get(w);
  return lvl !== undefined && lvl <= (r.heartCeiling ?? 10);
}

/** The phonics ceiling used when scoring a word against a level. Falls back to a
 * sensible default when a level omits phonicsCeiling. */
function ceilingFor(r: LevelRules): number {
  return r.phonicsCeiling ?? (r.decodability === "strict" ? 3 : 6);
}

/** Can the child read this word at this level? A word fits if it is systematically
 * decodable using graphemes up to the level's phonics ceiling (lib/reading/
 * phonics.ts) OR it is a level-appropriate heart / high-frequency word (see
 * HEART_WORD_TABLE). Phonics-first: decodability is the primary gate, heart words
 * are the small, deliberate exception — no whole-word Dolch sight list. */
function wordFitsLevel(w: string, r: LevelRules): boolean {
  const mode = r.decodability;
  if (mode === "none") return true;
  const ceiling = ceilingFor(r);
  if (heartFits(w, r) || phonicsDecodable(w, ceiling)) return true;
  // moderate: also allow the -s / plural form of an otherwise level-appropriate word.
  if (mode === "moderate" && w.endsWith("s") && w.length > 2) {
    const stem = w.slice(0, -1);
    if (heartFits(stem, r) || phonicsDecodable(stem, ceiling)) return true;
  }
  return false;
}

const MAX_TOPIC_EXEMPTIONS = 3; // the book's topic word + up to 2 related theme words (e.g. hockey/puck/goal) get a free pass, not every repeated hard word
const CONTRACTION_RE = /\w(n['’]t|['’](ll|re|ve|m|d))\b/i; // possessive 's is fine and deliberately not flagged

interface VocabAnalysis {
  nameNorm: string;
  castNames: Set<string>;
  topicWords: Set<string>;
  corePages: Map<string, Set<number>>; // core teaching word -> pages it appears on
}

/** Shared vocabulary analysis used by BOTH the QA gate (checkStory) and the
 * "Words in This Book" page (patternWords). Identifies the child's name, cast
 * names, the topic cluster, and the remaining CORE teaching words with the pages
 * each appears on — so the printed word list can never drift from what the
 * validator counts. */
function analyzeVocab(draft: Pick<StoryDraft, "pages" | "childName">, r: LevelRules): VocabAnalysis {
  const nameNorm = norm(draft.childName || "");
  // Cast names: words capitalized on every occurrence and present on 2+ pages
  // read like the child's own name — taught by the pictures.
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
  const castNames = new Set([...caseSeen].filter(([, x]) => x.lower === 0 && x.cap > 0 && x.pages.size >= 2).map(([w]) => w));
  // Topic cluster: the top MAX_TOPIC_EXEMPTIONS words repeated on 3+ pages that are
  // too long/undecodable — the topic word + related theme words, taught by
  // repetition and pictures (e.g. hockey/puck/goal).
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
  // Core teaching words = everything except the name, cast names, and topic cluster.
  const corePages = new Map<string, Set<number>>();
  draft.pages?.forEach((p) => {
    words(p.text).map(norm).forEach((w) => {
      if (!w || w === nameNorm || topicWords.has(w) || castNames.has(w)) return;
      if (!corePages.has(w)) corePages.set(w, new Set());
      corePages.get(w)!.add(p.n);
    });
  });
  return { nameNorm, castNames, topicWords, corePages };
}

/** The practiced "pattern words" a book teaches: core teaching words that repeat
 * on 2+ pages (the backbone the child drills). Excludes the child's name, cast
 * names, topic-cluster words, and single-use "story words". This is exactly the
 * list the "Words in This Book" page should show. */
export function patternWords(draft: Pick<StoryDraft, "pages" | "childName">, level: Level): string[] {
  const { corePages } = analyzeVocab(draft, level.rules);
  return [...corePages.entries()].filter(([, pages]) => pages.size >= 2).map(([w]) => w).sort();
}

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

  // Cast names, topic-cluster words, and the core teaching-word page map — shared
  // with patternWords() so the printed "Words in This Book" list can't drift from
  // what the validator counts here.
  const { castNames, topicWords, corePages } = analyzeVocab(draft, r);

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
        problems.push(`Page ${p.n}: word(s) the child can't decode at this level: ${hard.join(", ")} — swap for heart words or short phonetic words.`);
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

  // Controlled teaching set (decodable-reader model): the book's core vocabulary
  // — everything except the child's name, cast names, and topic words — is a
  // deliberate, bounded set of words, most REUSED across pages so the book truly
  // teaches them, plus a few single-use "story words" for the plot. Word legality
  // (decodable or level-appropriate heart word) is enforced per page above.
  if (r.sightWordBudget && draft.pages?.length) {
    const [minSet, maxSet] = r.sightWordBudget;
    // corePages comes from analyzeVocab() above (shared with patternWords()).
    const core = [...corePages.keys()];
    const patternWords = core.filter((w) => corePages.get(w)!.size >= 2);
    const storyWords = core.filter((w) => corePages.get(w)!.size < 2);
    // Total distinct core vocabulary must stay within the level's teaching budget.
    if (core.length > maxSet)
      problems.push(`Vocabulary: the book uses ${core.length} different core words (${core.join(", ")}) — this level teaches a set of ${minSet}-${maxSet}. Reuse words instead of adding new ones.`);
    // Enough words must REPEAT to form the practiced "pattern-word" backbone.
    const patternMin = r.patternMin ?? minSet;
    if (patternWords.length < patternMin)
      problems.push(`Pattern words: only ${patternWords.length} word(s) repeat across pages (${patternWords.join(", ") || "none"}) — this level needs at least ${patternMin} repeated backbone words the child practices. Reuse more words on multiple pages.`);
    // A few single-use "story words" are allowed — they carry the plot beats
    // (the problem, the search, the find) that turn a word list into a story.
    const storyMax = r.storyWordMax ?? 2;
    if (storyWords.length > storyMax)
      problems.push(`Story words: ${storyWords.length} words appear on only one page (${storyWords.join(", ")}) — at most ${storyMax} single-use story words are allowed; reuse the rest so the child practices them.`);
    // Word legality (decodable or level-appropriate heart word) is enforced per
    // page above; here we only govern the size and repetition of the teaching set.
  }

  // The title must be readable by the child too (name + topic words are fine).
  if (draft.title && r.decodability !== "none") {
    const hardTitle = [...new Set(words(draft.title).map(norm))].filter(
      (w) => w && w !== nameNorm && !topicWords.has(w) && !castNames.has(w) && !wordFitsLevel(w, { ...r, decodability: "moderate", phonicsCeiling: Math.max(r.phonicsCeiling ?? 6, 6) }),
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
        if (HEART_LEVEL.has(w)) return; // heart / high-frequency words aren't phonics-decoding practice
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

  return {
    pass: problems.length === 0,
    problems,
    warnings,
    stats: { totalWords, pages: draft.pages?.length || 0, uniqueWords: vocab.size },
  };
}
