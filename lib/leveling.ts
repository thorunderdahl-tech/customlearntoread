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
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 1, maxWordsPerPage: 3, maxAvgWordLength: 4.0, nameOnPageShare: 0.5 },
    promptRules:
      "Exactly ONE tiny sentence or label per page, 1-3 words (e.g. 'A cat.', 'Sam hops.', 'Big dog!'). Vocabulary: the child's name, CVC words, and the most common sight words (a, the, I, my, go, see, is). One strong repeating pattern through the book. Present tense. No commas, no dialogue. EXCEPTION: the book's main topic word (like dinosaur or princess) is allowed even if long — repetition and the pictures teach it.",
  },
  {
    id: "beginner",
    parentLabel: "Beginner Reader",
    formPrefixes: ["Level 2"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 3, maxWordsPerPage: 6, maxAvgWordLength: 4.4, nameOnPageShare: 0.5 },
    promptRules:
      "Exactly ONE sentence per page, 3-6 words, like early BOB Books: 'I see a cat.' 'I can run.' 'We can play.' 'The dog is here.' 'Sam can hop.' Repeat sentence structures across pages with one word changing. High-frequency sight words plus simple decodable words. ONE action per page. Present tense. No commas, no dialogue, no contractions. EXCEPTION: the book's main topic word (like dinosaur or princess) is allowed even if long — repetition and the pictures teach it.",
  },
  {
    id: "growing",
    parentLabel: "Growing Reader",
    formPrefixes: ["Level 3", "Level 4"],
    rules: { sentencesPerPage: [1, 1], minWordsPerPage: 4, maxWordsPerPage: 10, maxAvgWordLength: 5.0, nameOnPageShare: 0.4 },
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

/** Deterministic rubric check — QA gate #1 (pure code, no AI judgment). */
export function checkStory(draft: StoryDraft, level: Level): CheckResult {
  const problems: string[] = [];
  const r = level.rules;
  const nameNorm = norm(draft.childName || "");
  let totalWords = 0;
  let pagesWithName = 0;
  const vocab = new Set<string>();

  if (!draft.pages?.length) problems.push("Story has no pages.");

  // Topic-word allowance: a word repeated on 3+ pages is being taught by
  // repetition and pictures (BOB-Books style), so it is exempt from the
  // word-length rule no matter how long it is (e.g. "dinosaur").
  const pageOccurrences = new Map<string, number>();
  draft.pages?.forEach((p) => {
    new Set(words(p.text).map(norm)).forEach((w) => pageOccurrences.set(w, (pageOccurrences.get(w) || 0) + 1));
  });
  const topicWords = new Set([...pageOccurrences].filter(([, n]) => n >= 3).map(([w]) => w));

  draft.pages?.forEach((p) => {
    const ws = words(p.text);
    totalWords += ws.length;
    ws.forEach((w) => vocab.add(norm(w)));
    const sentences = sentenceSplit(p.text);
    if (sentences.length < r.sentencesPerPage[0] || sentences.length > r.sentencesPerPage[1])
      problems.push(`Page ${p.n}: ${sentences.length} sentence(s) — this level requires exactly ${r.sentencesPerPage[1] === r.sentencesPerPage[0] ? r.sentencesPerPage[0] : r.sentencesPerPage.join("-")} per page.`);
    if (ws.length > r.maxWordsPerPage || ws.length < r.minWordsPerPage)
      problems.push(`Page ${p.n}: ${ws.length} words — level allows ${r.minWordsPerPage}-${r.maxWordsPerPage}.`);
    const nonName = ws.filter((w) => norm(w) !== nameNorm && !topicWords.has(norm(w)));
    if (nonName.length) {
      const avg = nonName.reduce((a, w) => a + w.length, 0) / nonName.length;
      if (avg > r.maxAvgWordLength)
        problems.push(`Page ${p.n}: average word length ${avg.toFixed(1)} — max ${r.maxAvgWordLength} for this level.`);
    }
    if (nameNorm && p.text.split(/\s+/).some((w) => norm(w) === nameNorm)) pagesWithName++;
    if (!p.artPrompt || p.artPrompt.length < 20) problems.push(`Page ${p.n}: illustration direction missing or too thin.`);
  });

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
