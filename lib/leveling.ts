// Reading-level rubric. The level ids map 1:1 to the order form's
// "Reading level" options (matched by their "Level N" prefix).
// Each level carries HARD rules (enforced in code) and prompt guidance
// (given to the story model and the QA grader).

export type LevelId = "L1" | "L2" | "L3" | "L4";

export interface LevelRules {
  sentencesPerPage: [number, number];
  maxWordsPerPage: number;
  maxAvgWordLength: number; // average characters per word, name excluded
  nameOnPageShare: number; // fraction of pages that must include the child's name
}

export interface Level {
  id: LevelId;
  parentLabel: string;
  formPrefix: string;
  rules: LevelRules;
  promptRules: string;
}

export const LEVELS: Level[] = [
  {
    id: "L1",
    parentLabel: "Level 1 — brand-new reader",
    formPrefix: "Level 1",
    rules: { sentencesPerPage: [1, 1], maxWordsPerPage: 6, maxAvgWordLength: 4.2, nameOnPageShare: 0.6 },
    promptRules:
      "Exactly ONE short sentence per page, 3-6 words. Use a strong repeating sentence pattern (same frame, one word changes). Vocabulary: the child's name, CVC words (cat, sun, run), and core sight words (the, a, I, see, is, can, my, look, go). Present tense only. No contractions, no dialogue, no commas.",
  },
  {
    id: "L2",
    parentLabel: "Level 2 — very early reader",
    formPrefix: "Level 2",
    rules: { sentencesPerPage: [1, 2], maxWordsPerPage: 12, maxAvgWordLength: 4.6, nameOnPageShare: 0.5 },
    promptRules:
      "One to two simple sentences per page, max 12 words per page. Simple subject-verb-object patterns with familiar action words (jump, play, find, help). Light repetition with small variations. Sight words plus short decodable words. Present tense. No subordinate clauses.",
  },
  {
    id: "L3",
    parentLabel: "Level 3 — growing reader",
    formPrefix: "Level 3",
    rules: { sentencesPerPage: [2, 3], maxWordsPerPage: 28, maxAvgWordLength: 5.0, nameOnPageShare: 0.4 },
    promptRules:
      "Two to three sentences per page, max 28 words per page. A clear simple story arc (setup, small problem, happy resolution). Mostly one- and two-syllable words; introduce a few new words supported by context. Simple connectors allowed (and, but, so, then). Mild dialogue allowed (one short quoted line per page max).",
  },
  {
    id: "L4",
    parentLabel: "Level 4 — more confident reader",
    formPrefix: "Level 4",
    rules: { sentencesPerPage: [3, 5], maxWordsPerPage: 50, maxAvgWordLength: 5.4, nameOnPageShare: 0.3 },
    promptRules:
      "A short paragraph per page (3-5 sentences, max 50 words). Wider vocabulary with context support, varied sentence openings, richer story arc with feelings and a satisfying resolution. Dialogue allowed. Keep sentences under 12 words each.",
  },
];

/** Resolve the order form's reading_level text (or 'Not sure') to a Level. */
export function resolveLevel(formValue: string | undefined, age?: string | number): Level {
  const v = (formValue || "").trim();
  for (const lvl of LEVELS) if (v.startsWith(lvl.formPrefix)) return lvl;
  // "Not sure" or missing: pick by age, defaulting young.
  const n = typeof age === "number" ? age : parseInt(String(age || ""), 10);
  if (!Number.isFinite(n) || n <= 4) return LEVELS[0];
  if (n === 5) return LEVELS[1];
  if (n === 6) return LEVELS[2];
  return LEVELS[3];
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
  stats: { totalWords: number; pages: number };
}

const sentenceSplit = (t: string) => t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
const words = (t: string) => t.split(/\s+/).map((w) => w.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);

/** Deterministic rubric check — QA loop gate #1 (no AI judgment involved). */
export function checkStory(draft: StoryDraft, level: Level): CheckResult {
  const problems: string[] = [];
  const r = level.rules;
  const name = (draft.childName || "").toLowerCase();
  let totalWords = 0;
  let pagesWithName = 0;

  if (!draft.pages?.length) problems.push("Story has no pages.");
  draft.pages?.forEach((p) => {
    const ws = words(p.text);
    totalWords += ws.length;
    const sentences = sentenceSplit(p.text);
    if (sentences.length < r.sentencesPerPage[0] || sentences.length > r.sentencesPerPage[1])
      problems.push(`Page ${p.n}: ${sentences.length} sentence(s) — level allows ${r.sentencesPerPage[0]}-${r.sentencesPerPage[1]}.`);
    if (ws.length > r.maxWordsPerPage)
      problems.push(`Page ${p.n}: ${ws.length} words — max ${r.maxWordsPerPage}.`);
    const nonName = ws.filter((w) => w.toLowerCase() !== name);
    if (nonName.length) {
      const avg = nonName.reduce((a, w) => a + w.length, 0) / nonName.length;
      if (avg > r.maxAvgWordLength)
        problems.push(`Page ${p.n}: average word length ${avg.toFixed(1)} — max ${r.maxAvgWordLength} for this level.`);
    }
    if (name && p.text.toLowerCase().includes(name)) pagesWithName++;
    if (!p.artPrompt || p.artPrompt.length < 20) problems.push(`Page ${p.n}: art prompt missing or too thin.`);
  });

  if (draft.pages?.length && name) {
    const share = pagesWithName / draft.pages.length;
    if (share < r.nameOnPageShare)
      problems.push(`Child's name appears on ${Math.round(share * 100)}% of pages — needs ≥ ${Math.round(r.nameOnPageShare * 100)}% at this level.`);
  }
  if (!draft.title) problems.push("Missing title.");
  if (!draft.coverArtPrompt) problems.push("Missing cover art prompt.");

  return { pass: problems.length === 0, problems, stats: { totalWords, pages: draft.pages?.length || 0 } };
}
