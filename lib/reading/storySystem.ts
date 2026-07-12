// The "Adventure System" layer, live in the generator. Turns the story-system
// framework (templates × arcs × settings × tones × objectives) into a concrete
// PLAN per book, plus a variety engine so no two books for a child repeat.
// Pure data + functions — no app imports, so it's safe to use anywhere.

export type FourQuestions = { who: string; what: string; why: string; how: string };

export interface StoryPlan {
  key: string; // stable combination_key for variety memory
  template: string; // template id
  templateName: string;
  beats: string[];
  arc: string; // arc id
  arcName: string;
  arcTone: string;
  arcResolution: string;
  setting: string;
  tone: string; // overall feeling word
  objective: string; // objective id
  objectivePhrase: string;
}

const TEMPLATES: { id: string; name: string; beats: string[] }[] = [
  { id: "journey", name: "Journey to a Goal", beats: ["meet the child", "introduce the goal", "explore", "small challenge", "learn something", "celebrate"] },
  { id: "try-again", name: "Try, Try Again", beats: ["meet the child", "a problem appears", "first try", "learn something", "it works", "share the win"] },
  { id: "discovery", name: "Discovery", beats: ["notice something curious", "wonder and ask", "investigate", "the reveal", "delight"] },
  { id: "helper", name: "Someone Needs Help", beats: ["meet the child", "someone needs help", "decide to help", "help through effort", "warm thanks"] },
];

const ARCS: { id: string; name: string; tone: string; resolution: string }[] = [
  { id: "adventure", name: "Adventure", tone: "brave and exciting", resolution: "courage and effort" },
  { id: "funny", name: "Funny", tone: "silly and giggly", resolution: "cleverness and good humor" },
  { id: "competition", name: "Friendly Contest", tone: "eager and proud (everyone stays friends)", resolution: "effort and good sportsmanship" },
  { id: "mystery", name: "Little Mystery", tone: "curious and puzzled", resolution: "noticing clues" },
  { id: "discovery", name: "Discovery", tone: "wondering and amazed", resolution: "curiosity and observing" },
  { id: "helping", name: "Helping", tone: "kind and warm", resolution: "kindness and teamwork" },
  { id: "learning", name: "Learning a Skill", tone: "trying and patient", resolution: "practice and persistence" },
  { id: "cozy", name: "Cozy and Calm", tone: "gentle and happy", resolution: "warmth and contentment" },
];

const SETTINGS = [
  "a backyard", "a park", "home", "a forest", "a beach", "a museum", "a busy street",
  "a mountain", "a snowy day", "a river", "a farm", "a playground", "a campsite", "a garden",
];

const OBJECTIVES: { id: string; phrase: string }[] = [
  { id: "find", phrase: "find something" },
  { id: "build", phrase: "build or make something" },
  { id: "learn", phrase: "learn a new skill" },
  { id: "help", phrase: "help someone" },
  { id: "celebrate", phrase: "celebrate a happy moment" },
  { id: "explore", phrase: "explore a new place" },
  { id: "solve", phrase: "solve a small puzzle" },
];

const TONES = ["funny", "curious", "exciting", "proud", "gentle", "brave", "cheerful"];

// The youngest level suits calmer arcs; keep everything available but bias away
// from high-energy competition at the very first level.
const TINY_ARC_BLOCK = new Set(["competition"]);

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function compose(levelId: string): StoryPlan {
  const t = pick(TEMPLATES);
  const arcs = levelId === "tiny" ? ARCS.filter((a) => !TINY_ARC_BLOCK.has(a.id)) : ARCS;
  const a = pick(arcs);
  const setting = pick(SETTINGS);
  const tone = pick(TONES);
  const o = pick(OBJECTIVES);
  return {
    key: [t.id, a.id, setting, tone, o.id].join("|"),
    template: t.id, templateName: t.name, beats: t.beats,
    arc: a.id, arcName: a.name, arcTone: a.tone, arcResolution: a.resolution,
    setting, tone, objective: o.id, objectivePhrase: o.phrase,
  };
}

/** Count how many of the 5 axes differ between two combination keys. */
function axesDiff(a: string, b: string): number {
  const pa = a.split("|"), pb = b.split("|");
  let d = 0;
  for (let i = 0; i < 5; i++) if (pa[i] !== pb[i]) d++;
  return d;
}

/**
 * Pick a fresh story plan for a child. `avoidKeys` are combination keys from the
 * child's previous books. We try to differ from every recent book on at least 3
 * of the 5 axes (and never repeat an exact key); if we can't after many tries,
 * we return the most-different candidate we found.
 */
export function pickCombination(levelId: string, avoidKeys: string[] = []): StoryPlan {
  const recent = avoidKeys.slice(-6);
  let best: StoryPlan | null = null;
  let bestScore = -1;
  for (let i = 0; i < 60; i++) {
    const cand = compose(levelId);
    if (recent.includes(cand.key)) continue;
    const minDiff = recent.length ? Math.min(...recent.map((k) => axesDiff(cand.key, k))) : 5;
    if (minDiff >= 3) return cand;
    if (minDiff > bestScore) { bestScore = minDiff; best = cand; }
  }
  return best ?? compose(levelId);
}

/** Rebuild the full StoryPlan from a saved combination key
 * (template|arc|setting|tone|objective). Lets the revise step recover the plan a
 * draft was written to — revisions that lose the plan are the main way stories
 * flatten into page catalogs. */
export function planFromKey(key: string | undefined): StoryPlan | undefined {
  if (!key) return undefined;
  const [tId, aId, setting, tone, oId] = key.split("|");
  const t = TEMPLATES.find((x) => x.id === tId);
  const a = ARCS.find((x) => x.id === aId);
  const o = OBJECTIVES.find((x) => x.id === oId);
  if (!t || !a || !o || !setting || !tone) return undefined;
  return {
    key, template: t.id, templateName: t.name, beats: t.beats,
    arc: a.id, arcName: a.name, arcTone: a.tone, arcResolution: a.resolution,
    setting, tone, objective: o.id, objectivePhrase: o.phrase,
  };
}

/** Prompt-ready description of the plan, telling the model exactly what to write. */
export function describePlan(plan: StoryPlan): string {
  return `STORY PLAN — this is a STORY with a real beginning, middle, and end, NOT a list of similar pages. Make it specific and fresh:
- Structure: follow the "${plan.templateName}" shape — ${plan.beats.join(" → ")}. Walk through these beats IN ORDER across the pages: open on the child and their goal, build through the middle beats, hit the small challenge around two-thirds of the way in, then land the final beat on the LAST page(s) as a clear, happy resolution. Each page advances to the next beat — no page could be shuffled or removed without breaking the story.
- Arc & feeling: ${plan.arcName} — ${plan.arcTone}. Overall tone: ${plan.tone}. If the tone word fights the arc's feeling, the ARC wins — never bend the story to force a tone.
- Setting: ${plan.setting} (adapt it naturally to the book's topic — if the setting fights the topic, keep the TOPIC and shrink the setting to fit: "a beach" can become the sandbox, "a mountain" the big hill in the park).
- The child's goal: they want to ${plan.objectivePhrase}. Establish it early; the whole book is the child working toward it.
- How it resolves: through ${plan.arcResolution}. The CHILD succeeds through their own effort, kindness, or cleverness — never luck, coincidence, or an adult taking over. The final page MUST show that success and a warm, satisfying ending — do not just stop.

FOUR QUESTIONS — the story must answer these, and you must fill the "fourQuestions" field:
- who: who it's about (usually the child)
- what: what they want (concrete; tiny is fine)
- why: why it matters to them
- how: how they succeed (the value above)
Set it up so the "how" is foreshadowed earlier in the book, not pulled from nowhere. Keep it to ONE problem, resolved warmly, with a safe and happy ending.`;
}
