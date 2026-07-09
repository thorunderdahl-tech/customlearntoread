// First-line content moderation for customer free text that gets printed in a
// permanent, personalized book (child name, appearance notes, special details,
// gift message, themes). The goal is to make it impossible for something clearly
// offensive to slip into a printed keepsake.
//
// This is a fast, dependency-free BLOCKLIST guard for the egregious cases (slurs,
// explicit sexual content). It is intentionally conservative to avoid false
// positives on ordinary words; subtler judgment still relies on the operator
// review step before a book is made. For production-grade coverage, layer a
// hosted moderation API (e.g. OpenAI moderation) on top of this — see screenText.

// Severe terms only — the categories that must never reach print. Matched on
// word boundaries against normalized text, so ordinary words aren't caught.
// Extend cautiously; prefer adding a hosted moderation API over a huge list.
const BLOCKED_TERMS: string[] = [
  // racial / ethnic / identity slurs
  "nigger", "nigga", "faggot", "fag", "retard", "spic", "chink", "kike", "wetback", "tranny", "coon",
  // explicit sexual terms (not everyday profanity)
  "cunt", "cum", "blowjob", "handjob", "creampie", "porn", "pornhub", "rape", "molest", "pedophile", "pedo",
  // extreme violent/hateful
  "kill yourself", "kys",
];

// Leetspeak / spacing normalization so "n1gger" or "f a g" don't slip through.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ScreenResult = { ok: true } | { ok: false; term: string };

/** Screen a single string. Returns {ok:false, term} if it contains a blocked term. */
export function screenText(text: string | undefined | null): ScreenResult {
  if (!text) return { ok: true };
  const n = normalize(String(text));
  const collapsed = n.replace(/ /g, ""); // also catch spaced-out evasions (f a g -> fag)
  for (const term of BLOCKED_TERMS) {
    const re = new RegExp(`\\b${term.replace(/\s+/g, "\\s*")}\\b`, "i");
    if (re.test(n)) return { ok: false, term };
    if (!term.includes(" ") && collapsed.includes(term)) return { ok: false, term };
  }
  return { ok: true };
}

/** Screen every string value on an object. Returns the first offending field. */
export function screenFields(fields: Record<string, unknown>): { ok: true } | { ok: false; field: string } {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      const r = screenText(value);
      if (!r.ok) return { ok: false, field: key };
    }
  }
  return { ok: true };
}
