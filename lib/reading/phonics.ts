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
  ar: 8, or: 8, er: 8, ir: 8, ur: 8,
  oi: 9, oy: 9, ou: 9, oo: 9, aw: 9, au: 9,
  tch: 10, ph: 10, kn: 10, wr: 10,
};

const SPLIT_LEVEL = 6; // silent-e long vowels (a_e, i_e, o_e, u_e, e_e)

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

/** Can a reader who has been taught graphemes up to `ceiling` decode this word? */
export function phonicsDecodable(word: string, ceiling: number): boolean {
  const w = clean(word);
  if (!w) return true;
  let stripped = w;
  let magicReq = 0;
  if (w.length >= 3 && MAGIC_E.test(w)) {
    stripped = w.slice(0, -1);
    magicReq = SPLIT_LEVEL;
  }
  if (magicReq > ceiling) return false;
  for (const t of tokenize(stripped)) {
    const lv = GRAPHEME_LEVEL[t];
    if (lv === undefined || lv > ceiling) return false;
  }
  return true;
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
  { level: 5, allow: "the endings -ng and -ing", avoid: "-ng / -ing endings" },
  { level: 6, allow: "magic-e long vowels (a_e, i_e, o_e, u_e: cake, ride, home, cute)", avoid: "magic-e words (cake, ride)" },
  { level: 7, allow: "vowel teams ai, ay, ee, ea, oa, ow and igh (rain, play, feet, boat, night)", avoid: "vowel teams (rain, feet, boat)" },
  { level: 8, allow: "r-controlled vowels ar, or, er, ir, ur (car, fork, bird)", avoid: "r-controlled vowels (car, bird)" },
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
  return `DECODABLE WORDS — a systematic phonics check rejects anything off-scope, so stay inside it. Every word (other than the child's name, the taught high-frequency sight words, and the book's topic word) must be sound-out-able using ONLY these letter-sounds: ${allow}.${avoidStr} If a word would need an untaught pattern, choose a simpler word or a taught sight word instead.`;
}

/** Highest grapheme level needed to decode a word (null if undecodable). Handy
 * for diagnostics / "practices its own level" style checks. */
export function wordMaxLevel(word: string): number | null {
  const w = clean(word);
  if (!w) return 0;
  let stripped = w;
  let magicReq = 0;
  if (w.length >= 3 && MAGIC_E.test(w)) { stripped = w.slice(0, -1); magicReq = SPLIT_LEVEL; }
  let max = magicReq;
  for (const t of tokenize(stripped)) {
    const lv = GRAPHEME_LEVEL[t];
    if (lv === undefined) return null;
    if (lv > max) max = lv;
  }
  return max;
}
