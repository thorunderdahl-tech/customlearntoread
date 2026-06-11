// Story generation + AI grading prompts for the create pipeline.
import type { Level, StoryDraft } from "./leveling";

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

const STORY_SYSTEM = `You write personalized learn-to-read books for the family business "Custom Learn to Read". The hero of every book is a real child; the book exists to make THAT child feel seen and to meet them exactly at their reading level. Warm, joyful, encouraging tone. Never scary, never sad endings. You follow level rules EXACTLY — they are hard constraints, not suggestions. You reply with a single JSON object and nothing else.`;

export function buildGeneratePrompt(o: OrderInfo, level: Level, pageCount: number): string {
  return `Write a personalized learn-to-read book as JSON.

THE CHILD (the hero):
- Name: ${o.childName}
- Age: ${o.age || "unknown"}
- Pronouns: ${o.pronouns || "not given — infer nothing, write around pronouns if unclear"}
- Looks: hair ${o.hair || "?"}; eyes ${o.eyes || "?"}; skin ${o.skinTone || "?"}; ${o.glasses ? "accessories: " + o.glasses + ";" : ""} ${o.clothing ? "clothing: " + o.clothing + ";" : ""} ${o.lookNotes || ""}
- Loves (themes to build the story around): ${o.themes.join(", ") || "everyday adventures"}
- Special details from the parent: ${o.specialDetails || "none"}

READING LEVEL — HARD RULES (${level.parentLabel}):
${level.promptRules}

BOOK SHAPE:
- Exactly ${pageCount} story pages.
- The story must star ${o.childName} by name and weave in the themes meaningfully (not just name-dropped).
- Each page needs an "artPrompt": a vivid one-sentence illustration description for that page (what we see, where, mood). Always describe the child the same way, referring to them as "the child character". Do NOT put any words/text/signs inside the illustration descriptions.

Reply with ONLY this JSON shape:
{
  "title": "...",
  "levelId": "${level.id}",
  "childName": "${o.childName}",
  "characterDescription": "one rich sentence describing the child character's constant appearance (hair, eyes, skin, outfit) for the illustrator",
  "coverArtPrompt": "cover illustration description, no text in image",
  "pages": [ { "n": 1, "text": "...", "artPrompt": "..." } ]
}`;
}

export function buildGradePrompt(draft: StoryDraft, level: Level, o: OrderInfo): string {
  return `You are the quality gate for a personalized learn-to-read book. Grade this draft strictly.

LEVEL RULES (${level.parentLabel}):
${level.promptRules}

WHAT THE PARENT ORDERED:
- Child: ${o.childName}, age ${o.age || "?"}
- Themes: ${o.themes.join(", ") || "everyday adventures"}
- Special details: ${o.specialDetails || "none"}

DRAFT:
${JSON.stringify(draft, null, 1)}

Check, in order of importance:
1. Level fit: could a child at this exact level read every page successfully? Flag ANY word or sentence that breaks the rules.
2. Personalization: does the story genuinely star ${o.childName} and the ordered themes, or is it generic?
3. Story quality: clear arc, satisfying warm ending, natural read-aloud rhythm, no awkward phrasing.
4. Art prompts: each one concrete and consistent with the character description; none contain text-in-image.
5. Safety/tone: nothing scary, sad, branded, or off-tone for a children's book.

Reply with ONLY JSON:
{ "pass": true|false, "score": 1-10, "issues": ["specific fixable issue", ...], "praise": "one line on what works" }`;
}

export function buildRevisePrompt(draft: StoryDraft, level: Level, issues: string[]): string {
  return `Revise this learn-to-read book draft. Fix EVERY issue listed while keeping everything that works. Level rules remain hard constraints:
${level.promptRules}

ISSUES TO FIX:
${issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}

CURRENT DRAFT:
${JSON.stringify(draft, null, 1)}

Reply with ONLY the full corrected draft JSON in the same shape.`;
}
