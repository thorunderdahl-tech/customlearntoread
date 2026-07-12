// Golden-book eval harness — measure story quality instead of eyeballing it.
//
//   ANTHROPIC_API_KEY=sk-... node scripts/eval-stories.mjs [--n 8] [--level tiny|beginner|growing|confident]
//   (or: npm run eval:stories)
//
// Generates N complete story drafts through the REAL production prompts + revise
// loop (no art — story only, cheap), scores each with the deterministic rules
// check and the AI grader, and prints a summary table. Writes full results to
// eval-results/<timestamp>.json so two runs (before/after a prompt change) can
// be diffed. Run it before and after ANY change to lib/story.ts, lib/leveling.ts,
// lib/reading/*, or the story model — that's the whole point.
//
// Cost: ~5-8 Claude calls per book (generate + revises + grade). No Gemini.

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- args ----
const args = process.argv.slice(2);
const argVal = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const N = Math.max(1, parseInt(argVal("n", "4"), 10) || 4);
const LEVEL_FILTER = argVal("level", "all");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is required (story generation hits the real API).");
  process.exit(1);
}

// ---- compile the production modules on the fly (same approach as check-reading-rules) ----
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "clr-eval-"));
const tsc = path.join(root, "node_modules", ".bin", "tsc");
const srcs = ["lib/story.ts", "lib/leveling.ts", "lib/reading/phonics.ts", "lib/reading/storySystem.ts", "lib/brand.ts", "lib/llm.ts"]
  .map((f) => path.join(root, f)).join(" ");
execSync(`${tsc} ${srcs} --outDir ${outDir} --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck`, { stdio: "inherit" });
const { LEVELS, checkStory } = require(path.join(outDir, "leveling.js"));
const { buildGeneratePrompt, buildGradePrompt, buildRevisePrompt, STORY_SYSTEM } = require(path.join(outDir, "story.js"));
const { pickCombination, planFromKey } = require(path.join(outDir, "reading/storySystem.js"));
const { claude, parseJsonBlock } = require(path.join(outDir, "llm.js"));

// ---- synthetic orders (varied names incl. a two-word name, themes, looks) ----
const PROFILES = [
  { childName: "Reeva", age: "4", pronouns: "she/her", hair: "curly black, chin-length", eyes: "brown", skinTone: "medium brown", clothing: "yellow t-shirt with a sun, blue shorts", themes: ["dogs", "the park"], specialDetails: "her dog is named Biscuit" },
  { childName: "Mary Jane", age: "5", pronouns: "she/her", hair: "straight red, shoulder-length", eyes: "green", skinTone: "fair with freckles", clothing: "green striped shirt, denim overalls", themes: ["soccer"], specialDetails: "just lost her first tooth" },
  { childName: "Maximiliano", age: "6", pronouns: "he/him", hair: "short brown crop", eyes: "hazel", skinTone: "light tan", clothing: "red hoodie, black pants", themes: ["dinosaurs", "digging"], specialDetails: "calls his little sister 'Bean'" },
  { childName: "Kai", age: "7", pronouns: "he/him", hair: "black, short twists", eyes: "dark brown", skinTone: "deep brown", clothing: "orange t-shirt, gray joggers", themes: ["space", "rockets"], specialDetails: "wants to be an astronaut like Mae Jemison" },
];
const LEVEL_ORDER = ["tiny", "beginner", "growing", "confident"];
const levelsToRun = LEVEL_FILTER === "all" ? LEVEL_ORDER : [LEVEL_FILTER];

const FLAT_TITLE = /^\s*\w[\w' ]*('s)? (book|story)\s*$|^\s*\S+ and the \S+\s*$/i; // crude "flat label" detector

async function evalOne(i) {
  const profile = PROFILES[i % PROFILES.length];
  const levelId = levelsToRun[i % levelsToRun.length];
  const level = LEVELS.find((l) => l.id === levelId);
  const plan = pickCombination(level.id, []);
  const t0 = Date.now();
  let claudeCalls = 0;

  const gen = async (user, maxTokens) => { claudeCalls++; return claude({ system: STORY_SYSTEM, user, maxTokens }); };

  let draft = parseJsonBlock(await gen(buildGeneratePrompt(profile, level, 16, {}, plan), 8000));
  draft.combination = { key: plan.key, template: plan.template, arc: plan.arc, setting: plan.setting, tone: plan.tone, objective: plan.objective };
  let check = checkStory(draft, level);
  const passFirstTry = check.pass;
  let revises = 0;
  while (!check.pass && revises < 3) {
    draft = parseJsonBlock(await gen(buildRevisePrompt(draft, level, check.problems, planFromKey(draft.combination?.key), {}), 8000));
    revises++;
    check = checkStory(draft, level);
  }
  let grade = { pass: false, score: 0, issues: ["grade call failed"] };
  try { grade = parseJsonBlock(await gen(buildGradePrompt(draft, level, profile), 1200)); } catch { /* keep sentinel */ }

  return {
    child: profile.childName, level: levelId, title: draft.title,
    flatTitle: FLAT_TITLE.test(draft.title || ""),
    passFirstTry, revises, finalPass: check.pass,
    remainingProblems: check.pass ? [] : check.problems,
    warnings: check.warnings || [],
    gradePass: grade.pass, gradeScore: grade.score, gradeIssues: grade.issues || [],
    stats: check.stats, pages: draft.pages?.length || 0,
    combination: plan.key, claudeCalls, seconds: Math.round((Date.now() - t0) / 1000),
    draft, // full draft kept in the JSON for human spot-reads
  };
}

console.log(`Evaluating ${N} book(s) — levels: ${levelsToRun.join(", ")} (≈${N * 6} Claude calls)…\n`);
const results = [];
for (let i = 0; i < N; i++) {
  process.stdout.write(`  [${i + 1}/${N}] `);
  try {
    const r = await evalOne(i);
    results.push(r);
    console.log(`${r.child} · ${r.level} · "${r.title}" — rules ${r.finalPass ? "PASS" : "FAIL"}${r.passFirstTry ? " (first try)" : ` (${r.revises} revise${r.revises === 1 ? "" : "s"})`} · grade ${r.gradeScore}/10 · ${r.seconds}s`);
  } catch (e) {
    console.log(`ERROR: ${e?.message || e}`);
    results.push({ error: String(e?.message || e) });
  }
}

// ---- summary ----
const ok = results.filter((r) => !r.error);
const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
const avg = (xs) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "–");
console.log(`\n===== SUMMARY (${ok.length}/${results.length} completed) =====`);
console.log(`Rules pass first try : ${pct(ok.filter((r) => r.passFirstTry).length, ok.length)}%`);
console.log(`Rules pass final     : ${pct(ok.filter((r) => r.finalPass).length, ok.length)}%  (avg ${avg(ok.map((r) => r.revises))} revises)`);
console.log(`Grader pass          : ${pct(ok.filter((r) => r.gradePass).length, ok.length)}%  (avg score ${avg(ok.map((r) => r.gradeScore))}/10)`);
console.log(`Flat titles          : ${ok.filter((r) => r.flatTitle).length} of ${ok.length}  (${ok.map((r) => `"${r.title}"`).join(", ")})`);
console.log(`Avg Claude calls/book: ${avg(ok.map((r) => r.claudeCalls))} · avg ${avg(ok.map((r) => r.seconds))}s/book`);
const dupCombos = ok.length - new Set(ok.map((r) => r.combination)).size;
if (dupCombos > 0) console.log(`Variety: ${dupCombos} duplicate plan combination(s) — fine at small N.`);
for (const r of ok.filter((x) => !x.finalPass)) console.log(`\n✗ ${r.child}/${r.level} unresolved: ${r.remainingProblems.slice(0, 3).join(" | ")}`);

const outFile = path.join(root, "eval-results", `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ ranAt: new Date().toISOString(), n: N, levels: levelsToRun, results }, null, 1));
console.log(`\nFull results (incl. complete drafts for spot-reading): ${path.relative(root, outFile)}`);
