// Master book-generation prompts (story + grading) for the create pipeline.
// Encodes the CUSTOM LEARN TO READ master prompt: the goal is NOT a story for
// parents to read — it's a book the CHILD can successfully read themselves,
// in the spirit of early BOB Books. Pictures carry the story; text supports.
import type { Level, StoryDraft } from "./leveling";
import { BRAND_STORY_VOICE } from "./brand";

export interface OrderInfo {
  childName: string;
  age?: string;
  pronouns?: string;
  hair?: string;
  eyes?: string;
  skinTone?: string;
  glasses?: string;
  clothing?: string;
  lookNotes?: string;
  themes: string[];
  specialDetails?: string;
}

export interface StoryExtras {
  emotionalGoal?: string; // Confidence | Friendship | Kindness | Trying Something New | Teamwork | Courage
  mustUseWords?: string;
  avoidWords?: string;
}

export function orderInfoFromFields(f: Record<string, any>): OrderInfo {
  return {
    childName: f["Child name"] || "",
    age: f["Age"] || "",
    pronouns: f["Pronouns"] || "",
    hair: f["Hair"] || "",
    eyes: f["Eyes"] || "",
    skinTone: f["Skin tone"] || "",
    glasses: f["Glasses / accessories"] || "",
    clothing: f["Clothing"] || "",
    lookNotes: f["Look notes"] || "",
    themes: [f["Theme 1"], f["Theme 2"], f["Theme 3"]].filter(Boolean),
    specialDetails: f["Special details"] || "",
  };
}

export const STORY_SYSTEM = `You create personalized learn-to-read books for the family business "Custom Learn to Read".
THE GOAL IS NOT A STORY FOR PARENTS TO READ ALOUD. The goal is a book the child can successfully read THEMSELVES — like early BOB Books. Pictures carry most of the story; the text supports the picture.
WRITING RULES — DO: repeat vocabulary often; repeat sentence patterns; use predictable language; use concrete nouns; use familiar actions; keep the story positive; make the child the hero on every page.
DO NOT: use long sentences; use figurative language; use complex vocabulary; use multiple actions per page; use trademarked characters; use copyrighted brands, teams, logos, or franchises (generic versions only — "a race car", never a branded one).
Level rules are HARD constraints, not suggestions. You reply with a single JSON object and nothing else.

${BRAND_STORY_VOICE}`;

export function buildGeneratePrompt(o: OrderInfo, level: Level, pageCount: number, extras: StoryExtras = {}): string {
  const mainTopic = o.themes[0] || "everyday adventures";
  const supporting = o.themes.slice(1).join(", ");
  return `Create a personalized learn-to-read book as JSON.

THE CHILD (the hero — appears on every page):
- Name: ${o.childName}
- Age: ${o.age || "unknown"}
- Pronouns: ${o.pronouns || "not given — write around pronouns if unclear"}
- Appearance: hair ${o.hair || "?"}; eyes ${o.eyes || "?"}; skin tone ${o.skinTone || "?"}; ${o.glasses ? "glasses/accessories: " + o.glasses + ";" : ""} ${o.clothing ? "clothing: " + o.clothing + ";" : ""} ${o.lookNotes || ""}

THE BOOK:
- Main topic: ${mainTopic}
- Supporting characters/objects to weave in: ${supporting || "invent at most one simple friendly companion if it helps"}
- Special details from the parent (use them — they make the child feel seen): ${o.specialDetails || "none"}
- Emotional goal of the story: ${extras.emotionalGoal || "pick the best fit: confidence, friendship, kindness, trying something new, teamwork, or courage"}
${extras.mustUseWords ? `- MUST-USE words (work each in naturally, more than once where possible): ${extras.mustUseWords}` : ""}${extras.avoidWords ? `\n- Words to AVOID entirely: ${extras.avoidWords}` : ""}

READING LEVEL — HARD RULES (${level.parentLabel}):
${level.promptRules}

FORMAT:
- Exactly ${pageCount} interior pages. ONE sentence per page. ONE illustration per page. No paragraphs, no text blocks.
- Story arc across the pages: 1) introduction → 2) discovery → 3) fun activity → 4) small challenge → 5) success → 6) celebration → 7) positive ending.
- Repeat key vocabulary throughout so earlier pages teach the words later pages use.

ILLUSTRATION DIRECTIONS:
- Each page needs an "artPrompt": 2-3 concrete sentences of art direction that carry the story visually. Always specify: (1) the child character's action and facial expression/emotion, (2) the setting and 1-2 simple background elements, (3) camera framing (e.g. "wide shot", "close-up on face", "low angle looking up") — vary framing across pages so the book feels dynamic.
- The picture must tell the story even if the child can't read the words yet.
- Refer to the hero as "the child character" and keep their appearance identical on every page.
- Compose every scene with the subject and all key objects in the UPPER TWO-THIRDS of a portrait frame — the bottom of each page is covered by the reading-text band, and print trimming crops the outer edges.
- Clean simple backgrounds, no clutter, large readable facial expressions.
- NEVER describe any words, letters, signs, numbers, logos or brands in the illustration.

Reply with ONLY this JSON shape:
{
  "title": "...",
  "levelId": "${level.id}",
  "childName": "${o.childName}",
  "characterDescription": "one rich sentence locking the child character's constant appearance (hair, eyes, skin, glasses, outfit) for the illustrator",
  "coverArtPrompt": "cover illustration direction, no text in image",
  "pages": [ { "n": 1, "text": "...", "artPrompt": "..." } ]
}`;
}

export function buildGradePrompt(draft: StoryDraft, level: Level, o: OrderInfo): string {
  return `You are the FINAL CHECK quality gate for a personalized learn-to-read book. Grade strictly.

LEVEL RULES (${level.parentLabel}):
${level.promptRules}

WHAT THE PARENT ORDERED:
- Child: ${o.childName}, age ${o.age || "?"}
- Topics: ${o.themes.join(", ") || "everyday adventures"}
- Special details: ${o.specialDetails || "none"}

DRAFT:
${JSON.stringify(draft, null, 1)}

FINAL CHECK — verify each:
1. CHILD CAN READ IT: every page is ONE short sentence the child can decode at this exact level. Flag ANY word or sentence that breaks the rules. This is a book the child reads themselves, not a read-aloud.
2. Repetition & predictability: vocabulary and sentence patterns repeat like early BOB Books; one action per page; concrete nouns; familiar actions.
3. Child is the hero: ${o.childName} stars on every page; topic stays consistent; the ordered details genuinely shape the story.
4. Story arc: introduction → discovery → fun activity → small challenge → success → celebration → positive ending.
5. Illustration directions: concrete, uncluttered, consistent character, visually tell the story, contain NO text/brands/logos.
6. Safety & rights: positive tone, nothing scary; NO trademarked characters or copyrighted brands anywhere.

Reply with ONLY JSON:
{ "pass": true|false, "score": 1-10, "issues": ["specific fixable issue", ...], "praise": "one line on what works" }`;
}

export function buildRevisePrompt(draft: StoryDraft, level: Level, issues: string[]): string {
  return `Revise this learn-to-read book draft. Fix EVERY issue listed while keeping everything that works. The child must be able to read every page themselves. Level rules remain hard constraints:
${level.promptRules}

ISSUES TO FIX:
${issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}

CURRENT DRAFT:
${JSON.stringify(draft, null, 1)}

Reply with ONLY the full corrected draft JSON in the same shape.`;
}
