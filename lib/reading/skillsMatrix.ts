// Reading Skills Matrix — what each level actually teaches, expressed as
// "introduced" and "mastered" tiers. Gives every book measurable educational
// goals and is a credibility asset for the reading-approach page. Aligned to the
// four live levels (Tiny / Beginner / Growing / Confident).

export type Tier = "Tiny" | "Beginner" | "Growing" | "Confident";

export interface Skill {
  skill: string;
  category: "Phonics" | "Words" | "Sentences" | "Comprehension";
  introduced: Tier;
  mastered: Tier;
}

export const SKILLS_MATRIX: Skill[] = [
  { skill: "Short-vowel CVC words (cat, sit, hop)", category: "Phonics", introduced: "Tiny", mastered: "Beginner" },
  { skill: "Consonant blends (st, tr, mp, nd)", category: "Phonics", introduced: "Tiny", mastered: "Beginner" },
  { skill: "Consonant digraphs (sh, ch, th, wh, ck)", category: "Phonics", introduced: "Beginner", mastered: "Beginner" },
  { skill: "Magic-e long vowels (cake, ride, home)", category: "Phonics", introduced: "Beginner", mastered: "Growing" },
  { skill: "Vowel teams (rain, feet, boat)", category: "Phonics", introduced: "Growing", mastered: "Confident" },
  { skill: "Multi-syllable & r-controlled words (garden, corner)", category: "Phonics", introduced: "Growing", mastered: "Confident" },
  { skill: "High-frequency “heart” words (the, is, you)", category: "Words", introduced: "Tiny", mastered: "Beginner" },
  { skill: "Wider expressive vocabulary", category: "Words", introduced: "Growing", mastered: "Confident" },
  { skill: "One short sentence per page", category: "Sentences", introduced: "Tiny", mastered: "Beginner" },
  { skill: "Longer patterned sentences", category: "Sentences", introduced: "Beginner", mastered: "Growing" },
  { skill: "Compound sentences (and, but, so)", category: "Sentences", introduced: "Growing", mastered: "Confident" },
  { skill: "Short dialogue", category: "Sentences", introduced: "Growing", mastered: "Confident" },
  { skill: "Short paragraphs", category: "Sentences", introduced: "Confident", mastered: "Confident" },
  { skill: "Retell who & what", category: "Comprehension", introduced: "Tiny", mastered: "Beginner" },
  { skill: "Sequence of events", category: "Comprehension", introduced: "Beginner", mastered: "Growing" },
  { skill: "Cause & effect (why & how)", category: "Comprehension", introduced: "Growing", mastered: "Confident" },
];
