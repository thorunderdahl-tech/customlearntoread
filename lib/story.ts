// Master book-generation prompts (story + grading) for the create pipeline.
// Encodes the CUSTOM LEARN TO READ master prompt: the goal is NOT a story for
// parents to read — it's a book the CHILD can successfully read themselves,
// in the spirit of early BOB Books. Pictures carry the story; text supports.
import type { Level, StoryDraft } from "./leveling";
import { describePhonicsScope } from "./reading/phonics";
import { describePlan, type StoryPlan } from "./reading/storySystem";
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
  readAlong?: boolean; // Parent Read-Along Lines: also write a grown-up read-aloud line per page
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
DECODABLE-TEXT PRINCIPLE: this is systematic phonics, not guessing from pictures. Every word must be sound-out-able with the letter-sounds the child has been taught at their level, plus a small set of taught high-frequency "heart" words, the child's name, and the book's topic word. The exact phonics scope for this book's level is given in the level rules — a code-based phonics check rejects any word outside it, so write inside the scope the first time.
Level rules are HARD constraints, not suggestions. You reply with a single JSON object and nothing else.

${BRAND_STORY_VOICE}`;

export function buildGeneratePrompt(o: OrderInfo, level: Level, pageCount: number, extras: StoryExtras = {}, plan?: StoryPlan): string {
  const mainTopic = o.themes[0] || "everyday adventures";
  const supporting = o.themes.slice(1).join(", ");
  const [spMin, spMax] = level.rules.sentencesPerPage;
  const sppText =
    spMin === spMax
      ? spMin === 1 ? "ONE sentence per page" : `exactly ${spMin} sentences per page`
      : `${spMin}–${spMax} sentences per page (a short paragraph is fine at this level)`;
  // How much the illustrations must carry the story scales with how little text the
  // level allows — Levels 1 and 2 lean on the pictures the most.
  const mw = level.rules.maxWordsPerPage;
  const artSupport =
    mw <= 3
      ? '\n- AT THIS LEVEL the words are only a tiny 1-3 word caption, so the illustrations do almost ALL of the storytelling. Give each picture rich story detail and clear emotion, and make the change from one page to the next big and obvious — a wide "here they are" opening, the object getting away, worried faces searching, the happy find, a joyful finish — so the plot is unmistakable from the art even though the sentences barely change.'
      : mw <= 6
      ? '\n- AT THIS LEVEL the sentences are still short and simple, so the illustrations carry most of the storytelling and ALL of the emotional beats. Make each picture clearly show what is happening and how every character feels, with strong, obvious change page to page, so the story reads from the art as much as from the words.'
      : '';
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

${describePhonicsScope(level.rules.phonicsCeiling, level.rules.decodability)}

${plan ? describePlan(plan) + "\n\n" : ""}${extras.readAlong ? `PARENT READ-ALONG LINES (this order includes them): for EVERY page, also write an "adultLine" — ONE richer sentence for a grown-up to read ALOUD. It describes the SAME moment as the page's "text" but may use bigger words and fuller sentences; it is NOT limited by the child's reading level. Keep it warm and age-appropriate. The child's "text" stays exactly at level and is unchanged by this. Do not reference the adultLine in the illustration.\n\n` : ""}FORMAT:
- Exactly ${pageCount} interior pages. ${sppText}. ONE illustration per page. No text blocks longer than this level allows.
- NARRATIVE ARC IS REQUIRED — this is a story, not a word list. Map the STORY PLAN's beats across the ${pageCount} pages in order: the opening pages set up the child and their goal, the middle pages build the action through a small challenge, and the FINAL 1-2 pages MUST resolve it — the child succeeds and the book ends on a happy, satisfying beat that pays off the "how". The repeated sentence PATTERN stays (for decodability), but what HAPPENS must change and move forward every page — never a flat catalog whose pages could be reordered. (If no plan is given, use a simple beginning → small challenge → happy resolution.) One clear problem, resolved warmly.
- Repeat key vocabulary throughout so earlier pages teach the words later pages use.

ILLUSTRATION DIRECTIONS:
- Each page needs an "artPrompt": 2-3 concrete sentences of art direction that carry the story visually. Always specify: (1) the child character's action and facial expression/emotion, (2) the setting and 1-2 simple background elements, (3) camera framing (e.g. "wide shot", "close-up on face", "low angle looking up") — vary framing across pages so the book feels dynamic.
- THE PICTURES CARRY THE STORY ARC. Across the ${pageCount} pages the illustrations must follow the same beats as the text — set up the child and their goal, build the action, hit a clear problem or turning point about two-thirds through, show the effort to fix it, then land a happy resolution — with each character's face and body language changing to match the beat (curious, excited, worried, searching, relieved, joyful). No two illustrations may look the same: something visibly advances every page — a new action, a new spot, the object moving, an expression changing, the discovery. If the words were erased, a child should still be able to "read" the whole story from the pictures alone.${artSupport}
- Refer to the hero as "the child character" and keep their appearance identical on every page.
- EVERY other recurring character (friend, sibling, pet) MUST get an entry in "castDescriptions" locking their exact appearance (skin tone, hair, eyes, clothing / species, coloring, markings) — the illustrator and QA enforce these on every page, so a missing entry means that character will drift.
- Compose every scene with the subject and all key objects in the UPPER TWO-THIRDS of a portrait frame — the bottom of each page is covered by the reading-text band, and print trimming crops the outer edges.
- Clean simple backgrounds, no clutter, large readable facial expressions.
- NEVER describe any words, letters, signs, numbers, logos or brands in the illustration.

Reply with ONLY this JSON shape:
{
  "title": "...",
  "levelId": "${level.id}",
  "childName": "${o.childName}",
  "characterDescription": "one rich sentence locking the child character's constant appearance (hair, eyes, skin, glasses, outfit) for the illustrator",
  "castDescriptions": ["one sentence PER recurring character other than the hero — every friend, sibling, or pet who appears on 2+ pages gets an entry locking their constant appearance: name, skin tone, hair, eyes, clothing (or species, coloring, markings, collar). Empty array only if the hero is truly alone."],
  "coverArtPrompt": "cover illustration direction, no text in image",
  "fourQuestions": { "who": "who the story is about (usually ${o.childName})", "what": "what they want", "why": "why it matters", "how": "how they succeed" },
  "pages": [ { "n": 1, "text": "...", ${extras.readAlong ? `"adultLine": "grown-up read-aloud line for this page", ` : ""}"artPrompt": "..." } ]
}`;
}

export function buildGradePrompt(draft: StoryDraft, level: Level, o: OrderInfo): string {
  return `You are the FINAL CHECK quality gate for a personalized learn-to-read book. Grade strictly.

LEVEL RULES (${level.parentLabel}):
${level.promptRules}

${describePhonicsScope(level.rules.phonicsCeiling, level.rules.decodability)}

WHAT THE PARENT ORDERED:
- Child: ${o.childName}, age ${o.age || "?"}
- Topics: ${o.themes.join(", ") || "everyday adventures"}
- Special details: ${o.specialDetails || "none"}

DRAFT:
${JSON.stringify(draft, null, 1)}

FINAL CHECK — verify each:
1. CHILD CAN READ IT: every page stays within this level's sentences-per-page limit (see the level rules above), and every sentence is decodable by the child at this exact level. Flag ANY word or sentence that breaks the rules. This is a book the child reads themselves, not a read-aloud.
2. Repetition & predictability: vocabulary and sentence patterns repeat like early BOB Books; one action per page; concrete nouns; familiar actions.
3. Child is the hero: ${o.childName} stars on every page; topic stays consistent; the ordered details genuinely shape the story.
4. Story arc & resolution (grade strictly): the pages move through a real beginning → middle → end — setup, a small challenge, then a clear resolution where ${o.childName} SUCCEEDS, with the last page(s) delivering a happy, satisfying ending that pays off the fourQuestions "how". FAIL the draft if it reads as a flat list/catalog of similar pages with no rising action or no real ending — even if every page is individually on-level. The arc must also be visible in the ILLUSTRATIONS: the artPrompts should show scenes and emotions that clearly change and advance the plot page to page — this matters most at the lowest levels, where the words are only a caption and the pictures do the storytelling. Flag artPrompts that would produce 16 near-identical scenes.
5. Illustration directions: concrete, uncluttered, consistent character, visually tell the story, contain NO text/brands/logos. Every recurring character other than the hero has a castDescriptions entry locking skin tone, hair and clothing — flag any recurring character that lacks one.
6. Safety & rights: positive tone, nothing scary; NO trademarked characters or copyrighted brands anywhere.

Reply with ONLY JSON:
{ "pass": true|false, "score": 1-10, "issues": ["specific fixable issue", ...], "praise": "one line on what works" }`;
}

/** Turn a story model's one-line scene idea into rich, specific art direction.
 * Runs per page just before image generation so illustrations are well-composed
 * and print-safe, not literal one-liners. Returns a prompt for a text model. */
export function buildArtDirectionPrompt(pageText: string, roughScene: string, characterDescription: string, castText?: string): string {
  return `You are an expert children's picture-book art director. Expand the idea below into vivid, specific art direction for ONE illustration. Output ONE tight paragraph (max ~90 words) — no lists, no preamble, just the scene an illustrator would follow.

PAGE TEXT (the moment to illustrate): "${pageText}"
ROUGH IDEA: ${roughScene}
THE CHILD HERO: ${characterDescription}${castText ? `\nOTHER CHARACTERS (only if the scene includes them): ${castText}` : ""}

Make concrete:
- One clear focal action that matches the page text, with the character's warm, age-appropriate emotion.
- Camera framing that fits and varies the book: wide establishing, mid, close-up on the face, or low angle looking up.
- Composition: subject in the UPPER TWO-THIRDS; keep the bottom of the frame simple (a reading-text band covers it); keep every story-critical element at least 8% inside all four edges (print trimming crops the borders).
- A setting with just 1-2 background elements and a sense of depth (foreground / background).
- Warm golden-hour lighting and a cozy, harmonious color feel.
Do NOT include any text, letters, numbers, signs, logos, or brand/franchise characters. Reply with ONLY the paragraph.`;
}

export function buildRevisePrompt(draft: StoryDraft, level: Level, issues: string[], plan?: StoryPlan): string {
  const r = level.rules;
  // Levels with a bounded teaching set (1-2) are the ones where the reviser tends to
  // drift — it fixes a flagged page by inventing a NEW word, which breaks the vocab
  // budget elsewhere. Give it an explicit, numeric recipe so one pass converges.
  let recipe = "";
  if (r.sightWordBudget) {
    const [minSet, maxSet] = r.sightWordBudget;
    const patternMin = r.patternMin ?? minSet;
    const storyMax = r.storyWordMax ?? 2;
    const pageCount = draft.pages?.length || 16;
    const wordCap = r.stretchWordsPerPage && r.stretchWordsPerPage > r.maxWordsPerPage
      ? `${r.minWordsPerPage}-${r.maxWordsPerPage} words (at most ${Math.floor((r.stretchPageShare ?? 0) * pageCount)} pages may use ${r.stretchWordsPerPage})`
      : `${r.minWordsPerPage}-${r.maxWordsPerPage} words`;
    recipe = `HOW TO CONVERGE (do ALL of these — fixing one issue must not create another):
- Work from ONE fixed teaching set of ${minSet}-${maxSet} short words total (NOT counting ${draft.childName || "the child"}'s name or the topic/theme words). Do NOT introduce extra one-off words to patch a page — reuse words already in the set.
- Make at least ${patternMin} of those words REPEAT across 2+ pages (the practiced backbone). If a word appears on only one page, either reuse it on another page or swap it for a backbone word.
- Keep single-use words to at most ${storyMax} in the whole book.
- Every page's sentence must be UNIQUE — if two pages share the same words, change one.
- Each page stays ${wordCap}. Keep the child's name on at least ${Math.round(r.nameOnPageShare * 100)}% of pages.
- Preserve the story arc and the illustration directions; change only what the issues require.

`;
  }
  return `Revise this learn-to-read book draft. Fix EVERY issue listed while keeping everything that works. The child must be able to read every page themselves. Level rules remain hard constraints:
${level.promptRules}

${describePhonicsScope(level.rules.phonicsCeiling, level.rules.decodability)}

${plan ? describePlan(plan) + "\n\nKeep the same story plan and fourQuestions unless an issue requires changing them.\n\n" : ""}${draft.pages?.some((p) => p.adultLine) ? "This book has Parent Read-Along Lines: keep each page's \"adultLine\" (the grown-up read-aloud line); change it only if an issue names it.\n\n" : ""}${recipe}ISSUES TO FIX:
${issues.map((i, n) => `${n + 1}. ${i}`).join("\n")}

CURRENT DRAFT:
${JSON.stringify(draft, null, 1)}

Reply with ONLY the full corrected draft JSON in the same shape.`;
}
