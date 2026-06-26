// Generates a weekly training split tailored to the user's profile.
import { availableFor, type Exercise } from "./exercises";
import type { Plan, PlanDay, PlanExercise, Profile } from "./types";

interface RepScheme {
  compoundSets: number;
  isoSets: number;
  reps: string;
}

function repScheme(p: Profile): RepScheme {
  if (p.goal === "lose") return { compoundSets: 3, isoSets: 3, reps: "12-15" };
  if (p.goal === "gain") {
    return p.experience === "beginner"
      ? { compoundSets: 3, isoSets: 3, reps: "8-12" }
      : { compoundSets: 4, isoSets: 3, reps: "6-10" };
  }
  return { compoundSets: 3, isoSets: 3, reps: "8-12" };
}

type Group = Exercise["group"];

// Which muscle groups each training day targets, by weekly frequency.
const SPLITS: Record<number, { name: string; focus: string; groups: Group[] }[]> = {
  3: [
    { name: "Day A — Full Body", focus: "Push emphasis", groups: ["push", "legs", "pull", "core"] },
    { name: "Day B — Full Body", focus: "Pull emphasis", groups: ["pull", "legs", "push", "core"] },
    { name: "Day C — Full Body", focus: "Legs emphasis", groups: ["legs", "push", "pull", "core"] },
  ],
  4: [
    { name: "Day 1 — Upper", focus: "Chest, back, arms", groups: ["push", "pull", "push", "pull"] },
    { name: "Day 2 — Lower", focus: "Quads, hams, glutes", groups: ["legs", "legs", "core"] },
    { name: "Day 3 — Upper", focus: "Shoulders & arms", groups: ["push", "pull", "push", "pull"] },
    { name: "Day 4 — Lower", focus: "Posterior chain", groups: ["legs", "legs", "core"] },
  ],
  5: [
    { name: "Day 1 — Push", focus: "Chest, shoulders, triceps", groups: ["push", "push", "push", "core"] },
    { name: "Day 2 — Pull", focus: "Back & biceps", groups: ["pull", "pull", "pull"] },
    { name: "Day 3 — Legs", focus: "Quads, hams, calves", groups: ["legs", "legs", "legs", "core"] },
    { name: "Day 4 — Upper", focus: "Strength upper", groups: ["push", "pull", "push", "pull"] },
    { name: "Day 5 — Lower + Core", focus: "Glutes & core", groups: ["legs", "legs", "core", "core"] },
  ],
  6: [
    { name: "Day 1 — Push", focus: "Chest, shoulders, triceps", groups: ["push", "push", "push", "core"] },
    { name: "Day 2 — Pull", focus: "Back & biceps", groups: ["pull", "pull", "pull"] },
    { name: "Day 3 — Legs", focus: "Quad focus", groups: ["legs", "legs", "legs", "core"] },
    { name: "Day 4 — Push", focus: "Shoulder focus", groups: ["push", "push", "push", "core"] },
    { name: "Day 5 — Pull", focus: "Back thickness", groups: ["pull", "pull", "pull"] },
    { name: "Day 6 — Legs", focus: "Hamstring & glute", groups: ["legs", "legs", "legs", "core"] },
  ],
};

export function generatePlan(p: Profile): Plan {
  const scheme = repScheme(p);
  const template = SPLITS[p.daysPerWeek];

  const days: PlanDay[] = template.map((day, di) => {
    const used = new Set<string>();
    const exercises: PlanExercise[] = [];

    day.groups.forEach((group, gi) => {
      const pool = availableFor(p.equipment, group);
      // Rotate the starting index per day so different days pull different lifts.
      const pick = pool.find((e) => !used.has(e.name)) ??
        pool[(di + gi) % Math.max(1, pool.length)];
      if (!pick) return;
      used.add(pick.name);
      exercises.push({
        name: pick.name,
        muscle: pick.muscle,
        sets: pick.compound ? scheme.compoundSets : scheme.isoSets,
        reps: pick.compound ? scheme.reps : isoReps(scheme.reps),
      });
    });

    return {
      id: `day-${di}`,
      name: day.name,
      focus: day.focus,
      exercises,
    };
  });

  return {
    split: splitName(p.daysPerWeek),
    daysPerWeek: p.daysPerWeek,
    days,
    generatedAt: Date.now(),
  };
}

// Isolation work generally lives a couple reps higher than compounds.
function isoReps(reps: string): string {
  if (reps === "6-10") return "10-12";
  if (reps === "8-12") return "12-15";
  return reps;
}

function splitName(days: number): string {
  if (days === 3) return "3-Day Full Body";
  if (days === 4) return "4-Day Upper / Lower";
  if (days === 5) return "5-Day Push / Pull / Legs + Upper / Lower";
  return "6-Day Push / Pull / Legs";
}
