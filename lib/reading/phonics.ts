// Systematic phonics decodability engine (TypeScript port of the
// reading-system-foundation decoding engine). Given a word and a "phonics
// ceiling" (the highest grapheme level taught so far), decide whether the word
// can be sounded out using only graphemes taught by that level.
//
// This replaces the old CVC/CVCe heuristic in leveling.ts with a real
// grapheme-phoneme scope-and-sequence, so blends, digraphs, vowel teams,
// r-controlled vowels, etc. are scored correctly instead of by string tricks.
// Reference accent: General American. Pragmatic (greedy longest-match tokenizer
// + magic-e), not a full linguistic decoder — high-frequency irregular words are
// handled by the sight/heart-word lists in leveling.ts, not here.

// Grapheme -> level first taught (min level across its phonemes). Split vowels
// (a_e …) are handled specially by the magic-e rule below, at SPLIT_LEVEL.
const GRAPHEME_LEVEL: Record<string, number> = {
  // single letters
  a: 1, m: 1, s: 1, f: 1, n: 1, l: 1, r: 1, t: 1, p: 1, c: 1, d: 1, g: 1, b: 1, h: 1,
  i: 2, o: 2, k: 2, v: 2, w: 2, j: 2,
  e: 3, u: 3, x: 3, z: 3, y: 3, q: 3,
  // digraphs / trigraphs and beyond
  qu: 3,
  sh: 4, ch: 4, th: 4, wh: 4, ck: 4,
  ng: 5,
  ai: 7, ay: 7, ee: 7, ea: 7, oa: 7, ow: 7, igh: 7,
  ar: 8, or: 8, er: 8, ir: 8, ur: 8, tch: 8, // tch belongs with grade-1 skills (catch, match) — see pedagogy review D4
  oi: 9, oy: 9, ou: 9, oo: 9, aw: 9, au: 9,
  ph: 10, kn: 10, wr: 10,
};

// KNOWN LIMITATION (pedagogy review D5, deferred): no suffix morphology.
// -ing works by accident (i + ng graphemes); -ed has no rule, so "jumped"
// mis-scores. Affects only the looser upper levels. A proper fix is a small
// suffix-stripper (-ed/-ing/-er/-est) that scores the stem + a suffix level.

const SPLIT_LEVEL = 6; // silent-e long vowels (a_e, i_e, o_e, u_e, e_e)
const BLEND2_LEVEL = 3; // two-consonant blends (st, tr, mp, nd)
const BLEND3_LEVEL = 5; // three-consonant clusters (str, spl, scr) — a much harder blend, taught after digraphs
const FINAL_Y_LEVEL = 7; // word-final y as a long vowel (fly, cry / happy) — alongside vowel teams

// Vowel-sound graphemes: a consonant run (blend) resets when it hits one of these.
const VOWEL_TOKENS = new Set([
  "a", "e", "i", "o", "u",
  "ai", "ay", "ee", "ea", "oa", "ow", "igh",
  "ar", "or", "er", "ir", "ur",
  "oi", "oy", "ou", "oo", "aw", "au",
]);

// Common words whose spelling LIES: they match the magic-e (or plain short-vowel)
// pattern but aren't pronounced that way (give ≠ "gyve", love ≠ "loave", gone ≠
// "goan"). The engine can't decode these at ANY level — they only pass as
// heart words (lib/leveling.ts), which is exactly how they should be taught.
const IRREGULAR = new Set([
  "give", "live", "love", "dove", "glove", "shove", "above",
  "gone", "done", "none", "have", "some", "come", "one", "once",
  "were", "are", "there", "where", "sure",
  // Open-syllable CV words (pedagogy review D3): spelled like short-vowel words
  // but pronounced long — taught as early heart words, never as sound-outs.
  "no", "so", "be", "hi",
]);

// Multi-letter graphemes, longest first for greedy matching.
const MULTI = Object.keys(GRAPHEME_LEVEL)
  .filter((g) => g.length > 1)
  .sort((a, b) => b.length - a.length);

const MAGIC_E = /^[a-z]*[aeiou][bcdfghjklmnpqrstvz]e$/;

function clean(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function tokenize(word: string): string[] {
  const toks: string[] = [];
  let i = 0;
  while (i < word.length) {
    let hit: string | null = null;
    for (const g of MULTI) {
      if (word.startsWith(g, i)) { hit = g; break; }
    }
    if (hit) { toks.push(hit); i += hit.length; }
    else { toks.push(word[i]); i += 1; }
  }
  return toks;
}

/** Every grapheme/skill level this word requires, or null if the engine can't
 * decode it at any level (irregular spelling — heart-word territory). Shared by
 * phonicsDecodable and wordMaxLevel so the two can never disagree.
 * Beyond plain grapheme lookup this scores three skills the old checker missed:
 * magic-e, consonant-blend length (2 vs 3+ consonants), and word-final y as a
 * long vowel (fly/cry are NOT f-l-/y/ CVC words). */
function requiredLevels(word: string): number[] | null {
  const w = clean(word);
  if (!w) return [];
  if (IRREGULAR.has(w)) return null;
  const req: number[] = [];
  let stripped = w;
  if (w.length >= 3 && MAGIC_E.test(w)) {
    stripped = w.slice(0, -1);
    req.push(SPLIT_LEVEL);
  }
  const toks = tokenize(stripped);
  let run = 0; // consecutive consonant-sound graphemes (blend length)
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    // Word-final y after a consonant is a VOWEL sound (fly, cry, happy).
    if (t === "y" && i === toks.length - 1 && i > 0 && !VOWEL_TOKENS.has(toks[i - 1])) {
      req.push(FINAL_Y_LEVEL);
      continue;
    }
    const lv = GRAPHEME_LEVEL[t];
    if (lv === undefined) return null;
    req.push(lv);
    if (VOWEL_TOKENS.has(t)) { run = 0; continue; }
    run++;
    if (run === 2) req.push(BLEND2_LEVEL);
    else if (run >= 3) req.push(BLEND3_LEVEL); // str-, spl-, -mps: real blending skill
  }
  return req;
}

/** Does this word contain a consonant blend (2+ adjacent consonant sounds)?
 * Powers the Tiny-level soft cap (pedagogy review D2): blends are LEGAL at the
 * lowest level but should be rare — blending four phonemes (j-u-m-p) is a
 * brand-new reader's hardest work. */
export function hasBlend(word: string): boolean {
  const w = clean(word);
  if (!w) return false;
  const stem = w.length >= 3 && MAGIC_E.test(w) ? w.slice(0, -1) : w;
  const toks = tokenize(stem);
  let run = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if ((t === "y" && i === toks.length - 1 && i > 0) || VOWEL_TOKENS.has(t)) { run = 0; continue; }
    if (++run >= 2) return true;
  }
  return false;
}

/** Can a reader who has been taught graphemes up to `ceiling` decode this word? */
export function phonicsDecodable(word: string, ceiling: number): boolean {
  const req = requiredLevels(word);
  if (req === null) return false;
  return req.every((lv) => lv <= ceiling);
}

// Human-readable phonics scope per level tier — kept in lockstep with
// GRAPHEME_LEVEL so the generation prompt describes exactly what the checker
// enforces. `allow` = what this tier adds; `avoid` = short label used to warn the
// model off patterns above the level's ceiling.
const TIERS: { level: number; allow: string; avoid: string }[] = [
  { level: 1, allow: "short a, and single consonants", avoid: "" },
  { level: 2, allow: "short i and short o", avoid: "" },
  { level: 3, allow: "short e and short u (all five short vowels), and blends of two single consonants (st, tr, mp, nd)", avoid: "" },
  { level: 4, allow: "consonant digraphs sh, ch, th, wh, ck", avoid: "digraphs (sh, ch, th)" },
  { level: 5, allow: "the endings -ng and -ing, and three-consonant clusters (str, spl, scr)", avoid: "-ng endings and three-consonant clusters (strap, splash)" },
  { level: 6, allow: "magic-e long vowels (a_e, i_e, o_e, u_e: cake, ride, home, cute)", avoid: "magic-e words (cake, ride)" },
  { level: 7, allow: "vowel teams ai, ay, ee, ea, oa, ow and igh (rain, play, feet, boat, night), and y as a vowel at the end of words (fly, happy)", avoid: "vowel teams (rain, feet, boat) and words ending in vowel-y (fly, cry)" },
  { level: 8, allow: "r-controlled vowels ar, or, er, ir, ur (car, fork, bird), and -tch (catch, match)", avoid: "r-controlled vowels (car, bird)" },
  { level: 9, allow: "diphthongs oi, oy, ou, ow, oo, aw, au (coin, out, moon, saw)", avoid: "diphthongs and oo/aw words (moon, out, saw)" },
  { level: 10, allow: "longer multi-syllable words, soft c/g, and common prefixes/suffixes", avoid: "long multi-syllable words" },
];

/** A prompt-ready description of the letter-sounds allowed at a level, plus the
 * untaught patterns to avoid. Shares the ceiling with the checker so generation
 * targets exactly what validation enforces. */
export function describePhonicsScope(ceiling: number | undefined, decodability: string): string {
  if (decodability === "none" || ceiling === undefined) {
    return "DECODABLE WORDS: use mostly one- and two-syllable words a growing reader can sound out. Avoid rare or highly irregular spellings; when a longer word is needed, lean on repetition and the picture to support it.";
  }
  const allow = TIERS.filter((t) => t.level <= ceiling).map((t) => t.allow).join("; ");
  const avoid = TIERS.filter((t) => t.level > ceiling && t.avoid).map((t) => t.avoid).slice(0, 4);
  const avoidStr = avoid.length
    ? ` Do NOT use spelling patterns not yet taught — especially ${avoid.join(", ")}.`
    : "";
  return `DECODABLE WORDS — a systematic phonics check rejects anything off-scope, so stay inside it. Every word (other than the child's name, the taught high-frequency / heart words, and the book's topic word) must be sound-out-able using ONLY these letter-sounds: ${allow}.${avoidStr} If a word would need an untaught pattern, choose a simpler word or a taught heart word instead.`;
}

/** Highest grapheme level needed to decode a word (null if undecodable). Handy
 * for diagnostics / "practices its own level" style checks. */
export function wordMaxLevel(word: string): number | null {
  const req = requiredLevels(word);
  if (req === null) return null;
  return req.length ? Math.max(...req) : 0;
}
