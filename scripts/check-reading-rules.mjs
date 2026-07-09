// Regression suite for the reading-level rules (lib/leveling.ts).
//
// Run it with:  npm run test:reading
//
// It compiles the leveling + phonics modules on the fly (using the project's own
// TypeScript), then asserts two things across all four levels:
//   1. GOOD books PASS  — a hand-written, on-level 16-page book at each level,
//      plus topic-word exemptions (e.g. an undecodable word like "dinosaur").
//   2. BAD books are REJECTED — deliberately broken books trip the right rule
//      (too-long sentences, undecodable words, commas/dialogue/contractions at
//      the wrong level, too many sentences, missing name, missing story spine,
//      duplicate pages, and not enough repeated "pattern" words).
//
// No API and no network — pure validator logic. Re-run it before/after any change
// to lib/leveling.ts, lib/reading/phonics.ts, or the prompts to catch regressions.

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- compile the two modules we need to a throwaway dir ----
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "clr-rules-"));
const tsc = path.join(root, "node_modules", ".bin", "tsc");
try {
  execSync(
    `"${tsc}" lib/leveling.ts lib/reading/phonics.ts --outDir "${outDir}" ` +
      `--module commonjs --target es2020 --moduleResolution node --skipLibCheck`,
    { cwd: root, stdio: "pipe" },
  );
} catch (e) {
  console.error("Could not compile lib/leveling.ts. Run `npm install` first.\n" + (e.stdout || e.message));
  process.exit(1);
}
const { resolveLevel, checkStory, patternWords, wordKind } = require(path.join(outDir, "leveling.js"));

// ---- tiny assertion harness ----
let passed = 0;
const failures = [];
const A = (n, text) => ({ n, text, artPrompt: "Full-bleed warm picture-book art of this scene, clear, simple, one moment." });
const FQ = { who: "Reeva", what: "play with her friends", why: "they love it", how: "they work together" };
const book = (levelId, pages, extra = {}) => ({
  title: "Reeva and the Ball", levelId, childName: "Reeva",
  characterDescription: "Reeva, a cheerful child with dark curly hair.",
  castDescriptions: ["Hazel, a friend with red hair", "Aviva, a friend with braids"],
  coverArtPrompt: "Reeva and her friends playing with a ball at a sunny park, warm art.",
  fourQuestions: FQ, pages, ...extra,
});
function expectPass(desc, lvlStr, draft) {
  const r = checkStory(draft, resolveLevel(lvlStr));
  if (r.pass) { passed++; }
  else failures.push(`SHOULD PASS but was rejected — ${desc}\n     ${r.problems.join("\n     ")}`);
}
function expectReject(desc, lvlStr, draft, needle) {
  const r = checkStory(draft, resolveLevel(lvlStr));
  const hit = r.problems.some((p) => p.toLowerCase().includes(needle.toLowerCase()));
  if (!r.pass && hit) { passed++; }
  else failures.push(`SHOULD REJECT ("${needle}") but did not — ${desc}\n     pass=${r.pass}; problems: ${r.problems.join(" | ") || "(none)"}`);
}

// ---- 1. GOOD books, one per level (the validated Reeva samples) ----
expectPass("L1 on-level book", "Level 1 — brand-new reader", book("tiny", [
  A(1,"See Reeva."),A(2,"See Hazel."),A(3,"See Aviva."),A(4,"Reeva can run."),A(5,"Hazel can run."),
  A(6,"Reeva can see."),A(7,"Run Reeva run!"),A(8,"See the ball."),A(9,"Reeva can go."),A(10,"Go Aviva go!"),
  A(11,"Reeva can play."),A(12,"Play ball play!"),A(13,"Look Reeva look!"),A(14,"Look up now."),A(15,"Up Reeva up!"),A(16,"We can all play."),
]));
expectPass("L2 on-level book (incl. one 7-word stretch page)", "Level 2 — very early reader", book("beginner", [
  A(1,"Reeva has a red ball."),A(2,"Reeva can kick the ball."),A(3,"Hazel can kick it up."),A(4,"Aviva can kick it up."),
  A(5,"The ball can go up."),A(6,"Reeva and Hazel can run."),A(7,"Aviva can run and kick."),A(8,"Reeva can get the ball."),
  A(9,"Look at the red ball!"),A(10,"Reeva can look up."),A(11,"Hazel and Aviva look up."),A(12,"Reeva can get it."),
  A(13,"Reeva has the ball!"),A(14,"We can run and play."),A(15,"Reeva and Aviva can play."),A(16,"We can all run and play ball."),
]));
expectPass("L3 on-level book", "Level 3 — growing reader", book("growing", [
  A(1,"Reeva and Hazel ran to the park."),A(2,"Aviva had a big green ball."),A(3,"Reeva can kick the ball far."),
  A(4,"The ball went up in the tree."),A(5,"Reeva and Aviva look up."),A(6,"The ball is stuck in the tree."),
  A(7,"Hazel can not reach it."),A(8,"Reeva has a good plan."),A(9,"Aviva gets a long stick."),
  A(10,"Reeva pokes it with the stick."),A(11,"The ball drops down to Hazel."),A(12,"Hazel can get the ball!"),
  A(13,"Reeva and Aviva cheer."),A(14,"Reeva has the ball now!"),A(15,"They all play with the ball."),A(16,"Reeva had a fun day."),
]));
expectPass("L4 on-level book (dialogue, commas, past tense)", "Level 4 — confident reader", book("confident", [
  A(1,"Reeva and her best friends, Hazel and Aviva, went to the park."),
  A(2,"Reeva brought a bright green ball that she loved to kick."),
  A(3,"The three friends took turns booting it high into the sky."),
  A(4,"Then Reeva kicked it a little too hard."),
  A(5,"The ball sailed up and got stuck in a tall oak tree!"),
  A(6,'"Oh no, the ball is stuck!" cried Aviva.'),
  A(7,"Reeva thought hard and came up with a clever plan."),
  A(8,"She found a long branch under the old oak tree."),
  A(9,"Reeva stretched up high, but the branch was too short."),
  A(10,'"Let me try!" said Hazel, reaching as high as she could.'),
  A(11,"Aviva climbed onto a rock and gave the branch a poke."),
  A(12,"The green ball wobbled, then tumbled down to the grass."),
  A(13,"The three friends cheered and hugged each other tightly."),
  A(14,'"We did it together!" Reeva said with a huge grin.'),
  A(15,"Hazel and Aviva agreed that teamwork made everything fun."),
  A(16,"It was the very best day the three friends had ever had."),
]));
// Topic-word exemption: an undecodable word repeated as the topic is allowed.
expectPass("L1 undecodable topic word 'dinosaur' is exempt", "Level 1 — brand-new reader", book("tiny", [
  A(1,"See Reeva."),A(2,"See a dinosaur."),A(3,"Reeva can run."),A(4,"Run Reeva run!"),
  A(5,"Reeva can hop."),A(6,"Hop Reeva hop!"),A(7,"The dinosaur naps."),A(8,"Reeva can see."),
  A(9,"See the dinosaur."),A(10,"Reeva can go."),A(11,"Go Reeva go!"),A(12,"Reeva can play."),
  A(13,"Play Reeva play!"),A(14,"Look Reeva look!"),A(15,"A big dinosaur!"),A(16,"We can play."),
]));

// ---- 2. BAD books: each should trip the named rule ----
const bad = "Level 1 — brand-new reader";
expectReject("L1 sentence too long (5 words)", bad, book("tiny", [A(1,"Reeva can run and hop.")]), "level allows 1-3");
// A single 4-word page is fine (stretch), but too many 4-word pages trips the budget.
expectReject("L1 too many 4-word pages (>30%)", bad, book("tiny", [A(1,"Reeva can run fast."),A(2,"Reeva can hop fast."),A(3,"Reeva naps.")]), "too many long pages");
expectReject("L1 undecodable word", bad, book("tiny", [A(1,"See the cloud.")]), "decode");
expectReject("L1 comma", bad, book("tiny", [A(1,"Run, Reeva.")]), "comma");
expectReject("L1 dialogue", bad, book("tiny", [A(1,'"Go!" Reeva.')]), "dialogue");
expectReject("L2 word above ceiling (where)", "Level 2 — very early reader", book("beginner", [A(1,"Reeva can see where.")]), "decode");
expectReject("L2 sentence too long (8 words)", "Level 2 — very early reader", book("beginner", [A(1,"Reeva can run and kick the big ball.")]), "level allows 3-6");
expectReject("L2 too many 7-word pages (>30%)", "Level 2 — very early reader", book("beginner", [A(1,"Reeva can run and kick the ball."),A(2,"Hazel can run and kick the ball."),A(3,"Reeva naps.")]), "too many long pages");
// Adversarial decodability trap: a heart word that isn't taught until a later level.
expectReject("L1 undecodable heart word too early (said)", bad, book("tiny", [A(1,"Reeva said go.")]), "decode");
expectReject("L3 contraction", "Level 3 — growing reader", book("growing", [A(1,"Reeva can not stop but she can't wait.")]), "contraction");
expectReject("L3 two sentences on a page", "Level 3 — growing reader", book("growing", [A(1,"Reeva ran home. Reeva sat down.")]), "sentence");
expectReject("L4 too many words", "Level 4 — confident reader", book("confident", [A(1,"Reeva and Hazel and Aviva all ran down the long green hill to the little pond.")]), "level allows");
expectReject("L4 three sentences", "Level 4 — confident reader", book("confident", [A(1,"Reeva ran fast. Hazel jumped high. Aviva laughed out loud today.")]), "sentence");

const goodL1Pages = [
  A(1,"See Reeva."),A(2,"See Hazel."),A(3,"See Aviva."),A(4,"Reeva can run."),A(5,"Hazel can run."),
  A(6,"Reeva can see."),A(7,"Run Reeva run!"),A(8,"See the ball."),A(9,"Reeva can go."),A(10,"Go Aviva go!"),
  A(11,"Reeva can play."),A(12,"Play ball play!"),A(13,"Look Reeva look!"),A(14,"Look up now."),A(15,"Up Reeva up!"),A(16,"We all play."),
];
expectReject("L1 hero name missing from pages", bad, book("tiny", goodL1Pages, { childName: "Zamir" }), "name appears");
expectReject("L1 hard title word (storm)", bad, book("tiny", goodL1Pages, { title: "Reeva and the Storm" }), "title");
expectReject("L1 missing four-questions spine", bad, book("tiny", goodL1Pages, { fourQuestions: undefined }), "four-questions");
expectReject("L1 duplicate page text", bad, book("tiny", goodL1Pages.map((p, i) => (i === 13 ? A(14, "Look Reeva look!") : p))), "identical");
expectReject("L1 no repetition (every word unique)", bad, book("tiny", [
  A(1,"See Reeva."),A(2,"Hazel naps."),A(3,"Aviva hops."),A(4,"Reeva sits."),A(5,"Dogs run."),A(6,"Cats nap."),
  A(7,"Bugs hop."),A(8,"Pigs dig."),A(9,"Hens peck."),A(10,"Reeva wins."),A(11,"Foxes hide."),A(12,"Ducks swim."),
  A(13,"Reeva digs."),A(14,"Bats hang."),A(15,"Reeva rests."),A(16,"Owls hoot."),
]), "pattern words");

// ---- report ----
const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`\n✓ reading-rules regression suite: ${passed}/${total} checks passed\n`);
  process.exit(0);
} else {
  console.log(`\n✗ reading-rules regression suite: ${failures.length} of ${total} checks FAILED\n`);
  failures.forEach((f) => console.log(" - " + f + "\n"));
  process.exit(1);
}
