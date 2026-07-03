// Reading-level rubric — the "meet the reader where they are" rulebook.
// Three parent-friendly levels (Tiny / Beginner / Growing Reader) per the
// master book-generation prompt. Order-form mapping: Level 1 -> tiny,
// Level 2 -> beginner, Level 3/4 -> growing, "Not sure" -> by age.
// Books are BOB-Books-like: ONE sentence per page, pictures carry the story.

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
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 1, maxWordsPerPage: 3, maxAvgWordLength: 4.0, nameOnPageShare: 0.5, allowCommas: false, allowContractions: false, allowDialogue: false, decodability: "strict" },
    promptRules:
      "Exactly ONE tiny sentence or label per page, 1-3 words (e.g. 'A cat.', 'Sam hops.', 'Big dog!'). Vocabulary: the child's name, CVC words, and the most common sight words (a, the, I, my, go, see, is). One strong repeating pattern through the book. Present tense. No commas, no dialogue. EXCEPTION: the book's main topic word (like dinosaur or princess) is allowed even if long — repetition and the pictures teach it.",
  },
  {
    id: "beginner",
    parentLabel: "Beginner Reader",
    formPrefixes: ["Level 2"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 3, maxWordsPerPage: 6, maxAvgWordLength: 4.4, nameOnPageShare: 0.5, allowCommas: false, allowContractions: false, allowDialogue: false, decodability: "moderate" },
    promptRules:
      "Exactly ONE sentence per page, 3-6 words, like early BOB Books: 'I see a cat.' 'I can run.' 'We can play.' 'The dog is here.' 'Sam can hop.' Repeat sentence structures across pages with one word changing. High-frequency sight words plus simple decodable words. ONE action per page. Present tense. No commas, no dialogue, no contractions. EXCEPTION: the book's main topic word (like dinosaur or princess) is allowed even if long — repetition and the pictures teach it.",
  },
  {
    id: "growing",
    parentLabel: "Growing Reader",
    formPrefixes: ["Level 3", "Level 4"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 4, maxWordsPerPage: 10, maxAvgWordLength: 5.0, nameOnPageShare: 0.4, allowCommas: false, allowContractions: false, allowDialogue: true, decodability: "none" },
    promptRules:
      "Exactly ONE sentence per page, 4-10 words. Still predictable and patterned, but with a fuller story arc and a few new words a growing reader can decode from context. Mostly one- and two-syllable words. ONE action per page. Simple connectors allowed (and, but, so). Present tense. No dialogue longer than three words. EXCEPTION: the book's main topic word is allowed even if long — repetition and the pictures teach it.",
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
}

export interface CheckResult {
  pass: boolean;
  problems: string[];
  stats: { totalWords: number; pages: number; uniqueWords: number };
}

const sentenceSplit = (t: string) => t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");
const words = (t: string) => t.split(/\s+/).map((w) => w.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);

// ---- decodability vocabulary (see docs/reading-levels.md) ----
// Dolch pre-primer + primer sight words.
const SIGHT_CORE = new Set(("a and away big blue can come down find for funny go help here i in is it jump little look make me my not one play red run said see the three to two up we where yellow you " +
  "all am are at ate be black brown but came did do eat four get good have he into like must new no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes").split(" "));
// Dolch first-grade + common Dolch nouns — the "moderate" extension.
const SIGHT_EXTENDED = new Set(("after again an any as ask by could every fly from give going had has her him his how just know let live may of old once open over put round some stop take thank them then think walk were when " +
  "apple baby ball bear bed bird boat book box boy bus cake car cat chair cow day dog door duck egg eye farm fish frog fun game girl goat hat hen hill home horse house kitten leg man men milk moon morning mother name nest night pig rain ring school seed sheep shoe snow song stick street sun table thing time top toy tree water way wind window wood").split(" "));

const VOWELS = "aeiou";
/** Phonics heuristic: short decodable words (CVC-pattern family: at, cat, stop, hand…). */
function isDecodableShort(w: string): boolean {
  if (w.length < 2 || w.length > 4) return false;
  if (!/^[a-z]+$/.test(w)) return false;
  const groups = w.match(/[aeiou]+/g);
  if (!groups || groups.length !== 1 || groups[0].length !== 1) return false; // exactly one short vowel
  return !VOWELS.includes(w[w.length - 1]); // ends in a consonant
}
/** Moderate additionally allows CVCe (magic-e: cake, ride) and simple -s plurals of decodable words. */
function isDecodableModerate(w: string): boolean {
  if (isDecodableShort(w)) return true;
  if (w.length >= 3 && w.length <= 5 && w.endsWith("e")) {
    const stem = w.slice(0, -1);
    const groups = stem.match(/[aeiou]+/g);
    if (groups && groups.length === 1 && groups[0].length === 1 && !VOWELS.includes(stem[stem.length - 1])) return true;
  }
  if (w.endsWith("s") && w.length > 2 && isDecodableShort(w.slice(0, -1))) return true;
  return false;
}
function wordFitsLevel(w: string, decodability: "strict" | "moderate" | "none"): boolean {
  if (decodability === "none") return true;
  if (SIGHT_CORE.has(w)) return true;
  if (decodability === "strict") return isDecodableShort(w);
  if (SIGHT_EXTENDED.has(w) || isDecodableModerate(w)) return true;
  // -s forms of sight words (sees, plays, cats) read as easily as their stems.
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
      .filter(([w, n]) => n >= 3 && w !== nameNorm && (r.decodability === "none" ? w.length > r.maxAvgWordLength : !wordFitsLevel(w, r.decodability)))
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
        (w) => w && w !== nameNorm && !topicWords.has(w) && !castNames.has(w) && !wordFitsLevel(w, r.decodability),
      );
      if (hard.length)
        problems.push(`Page ${p.n}: word(s) the child can't decode at this level: ${hard.join(", ")} — swap for sight words or short phonetic words.`);
    }
    if (nameNorm && p.text.split(/\s+/).some((w) => norm(w) === nameNorm)) pagesWithName++;
    if (!p.artPrompt || p.artPrompt.length < 20) problems.push(`Page ${p.n}: illustration direction missing or too thin.`);
  });

  // The title must be readable by the child too (name + topic words are fine).
  if (draft.title && r.decodability !== "none") {
    const hardTitle = [...new Set(words(draft.title).map(norm))].filter(
      (w) => w && w !== nameNorm && !topicWords.has(w) && !castNames.has(w) && !wordFitsLevel(w, "moderate"),
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

  return {
    pass: problems.length === 0,
    problems,
    stats: { totalWords, pages: draft.pages?.length || 0, uniqueWords: vocab.size },
  };
}
