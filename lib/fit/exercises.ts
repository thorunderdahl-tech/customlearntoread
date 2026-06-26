// A compact but useful exercise library, tagged by muscle group and the
// minimum equipment required. Used by the plan generator.
import type { Equipment } from "./types";

export interface Exercise {
  name: string;
  muscle: string;
  group: "push" | "pull" | "legs" | "core";
  /** Lowest equipment tier this works with. */
  needs: Equipment;
  compound: boolean;
}

export const EXERCISES: Exercise[] = [
  // ---- PUSH (chest / shoulders / triceps) ----
  { name: "Barbell Bench Press", muscle: "Chest", group: "push", needs: "full-gym", compound: true },
  { name: "Incline Barbell Press", muscle: "Upper chest", group: "push", needs: "full-gym", compound: true },
  { name: "Overhead Barbell Press", muscle: "Shoulders", group: "push", needs: "full-gym", compound: true },
  { name: "Cable Triceps Pushdown", muscle: "Triceps", group: "push", needs: "full-gym", compound: false },
  { name: "Dumbbell Bench Press", muscle: "Chest", group: "push", needs: "dumbbells", compound: true },
  { name: "Dumbbell Shoulder Press", muscle: "Shoulders", group: "push", needs: "dumbbells", compound: true },
  { name: "Dumbbell Lateral Raise", muscle: "Side delts", group: "push", needs: "dumbbells", compound: false },
  { name: "Dumbbell Overhead Extension", muscle: "Triceps", group: "push", needs: "dumbbells", compound: false },
  { name: "Push-Up", muscle: "Chest", group: "push", needs: "bodyweight", compound: true },
  { name: "Pike Push-Up", muscle: "Shoulders", group: "push", needs: "bodyweight", compound: true },
  { name: "Diamond Push-Up", muscle: "Triceps", group: "push", needs: "bodyweight", compound: false },

  // ---- PULL (back / biceps / rear delts) ----
  { name: "Deadlift", muscle: "Back / posterior chain", group: "pull", needs: "full-gym", compound: true },
  { name: "Barbell Row", muscle: "Back", group: "pull", needs: "full-gym", compound: true },
  { name: "Lat Pulldown", muscle: "Lats", group: "pull", needs: "full-gym", compound: true },
  { name: "Cable Face Pull", muscle: "Rear delts", group: "pull", needs: "full-gym", compound: false },
  { name: "Barbell Curl", muscle: "Biceps", group: "pull", needs: "full-gym", compound: false },
  { name: "One-Arm Dumbbell Row", muscle: "Back", group: "pull", needs: "dumbbells", compound: true },
  { name: "Dumbbell Romanian Deadlift", muscle: "Hamstrings / back", group: "pull", needs: "dumbbells", compound: true },
  { name: "Dumbbell Curl", muscle: "Biceps", group: "pull", needs: "dumbbells", compound: false },
  { name: "Dumbbell Rear-Delt Fly", muscle: "Rear delts", group: "pull", needs: "dumbbells", compound: false },
  { name: "Pull-Up / Inverted Row", muscle: "Back", group: "pull", needs: "bodyweight", compound: true },
  { name: "Superman Hold", muscle: "Lower back", group: "pull", needs: "bodyweight", compound: false },

  // ---- LEGS ----
  { name: "Back Squat", muscle: "Quads / glutes", group: "legs", needs: "full-gym", compound: true },
  { name: "Leg Press", muscle: "Quads", group: "legs", needs: "full-gym", compound: true },
  { name: "Romanian Deadlift", muscle: "Hamstrings", group: "legs", needs: "full-gym", compound: true },
  { name: "Seated Leg Curl", muscle: "Hamstrings", group: "legs", needs: "full-gym", compound: false },
  { name: "Standing Calf Raise", muscle: "Calves", group: "legs", needs: "full-gym", compound: false },
  { name: "Goblet Squat", muscle: "Quads / glutes", group: "legs", needs: "dumbbells", compound: true },
  { name: "Dumbbell Walking Lunge", muscle: "Quads / glutes", group: "legs", needs: "dumbbells", compound: true },
  { name: "Dumbbell Calf Raise", muscle: "Calves", group: "legs", needs: "dumbbells", compound: false },
  { name: "Bodyweight Squat", muscle: "Quads / glutes", group: "legs", needs: "bodyweight", compound: true },
  { name: "Bulgarian Split Squat", muscle: "Quads / glutes", group: "legs", needs: "bodyweight", compound: true },
  { name: "Glute Bridge", muscle: "Glutes", group: "legs", needs: "bodyweight", compound: false },

  // ---- CORE ----
  { name: "Hanging Leg Raise", muscle: "Abs", group: "core", needs: "full-gym", compound: false },
  { name: "Cable Crunch", muscle: "Abs", group: "core", needs: "full-gym", compound: false },
  { name: "Weighted Plank", muscle: "Core", group: "core", needs: "dumbbells", compound: false },
  { name: "Russian Twist", muscle: "Obliques", group: "core", needs: "dumbbells", compound: false },
  { name: "Plank", muscle: "Core", group: "core", needs: "bodyweight", compound: false },
  { name: "Bicycle Crunch", muscle: "Abs", group: "core", needs: "bodyweight", compound: false },
  { name: "Mountain Climber", muscle: "Core", group: "core", needs: "bodyweight", compound: false },
];

const TIER: Record<Equipment, number> = {
  bodyweight: 0,
  dumbbells: 1,
  "full-gym": 2,
};

/** Exercises usable with the given equipment, preferring the richest tier available. */
export function availableFor(
  equipment: Equipment,
  group: Exercise["group"]
): Exercise[] {
  const have = TIER[equipment];
  const pool = EXERCISES.filter(
    (e) => e.group === group && TIER[e.needs] <= have
  );
  // Prefer exercises that use the most of what the user has.
  return pool.sort((a, b) => TIER[b.needs] - TIER[a.needs]);
}
