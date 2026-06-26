// Nutrition + body-metric math for FitForge.
import type { Activity, Diet, Goal, MacroTargets, Profile } from "./types";

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentary: "Sedentary — desk job, little exercise",
  light: "Light — exercise 1–3 days/week",
  moderate: "Moderate — exercise 3–5 days/week",
  active: "Active — exercise 6–7 days/week",
  veryActive: "Very active — physical job or 2x/day",
};

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(p.sex === "male" ? base + 5 : base - 161);
}

export function tdee(p: Profile): number {
  return Math.round(bmr(p) * ACTIVITY_FACTOR[p.activity]);
}

/** One kg of body weight ≈ 7700 kcal. */
function dailyDelta(rateKgPerWeek: number): number {
  return Math.round((rateKgPerWeek * 7700) / 7);
}

export function calorieTarget(p: Profile): number {
  const maintenance = tdee(p);
  const delta = dailyDelta(p.rate);
  let target = maintenance;
  if (p.goal === "lose") target = maintenance - delta;
  if (p.goal === "gain") target = maintenance + delta;
  // Never recommend dropping below a sane floor.
  const floor = p.sex === "male" ? 1500 : 1200;
  return Math.max(floor, Math.round(target / 10) * 10);
}

interface MacroSplit {
  proteinPerKg: number;
  fatPct: number; // share of calories from fat
}

const DIET_SPLIT: Record<Diet, MacroSplit> = {
  balanced: { proteinPerKg: 1.8, fatPct: 0.3 },
  "high-protein": { proteinPerKg: 2.2, fatPct: 0.25 },
  "low-carb": { proteinPerKg: 2.0, fatPct: 0.4 },
  keto: { proteinPerKg: 1.8, fatPct: 0.7 },
  vegan: { proteinPerKg: 1.6, fatPct: 0.28 },
};

export function macroTargets(p: Profile): MacroTargets {
  const calories = calorieTarget(p);
  const split = DIET_SPLIT[p.diet];
  // Slightly more protein when cutting to preserve muscle.
  const proteinPerKg = split.proteinPerKg + (p.goal === "lose" ? 0.2 : 0);
  const protein = Math.round(p.weightKg * proteinPerKg);
  const fat = Math.round((calories * split.fatPct) / 9);
  const remaining = calories - protein * 4 - fat * 9;
  const carbs = Math.max(0, Math.round(remaining / 4));
  return { calories, protein, carbs, fat };
}

// ---- unit conversion helpers ----
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inch: number) => inch * CM_PER_IN;

export function displayWeight(kg: number, units: "metric" | "imperial"): number {
  return Math.round((units === "imperial" ? kgToLb(kg) : kg) * 10) / 10;
}

export const weightUnit = (units: "metric" | "imperial") =>
  units === "imperial" ? "lb" : "kg";

export const GOAL_LABEL: Record<Goal, string> = {
  lose: "Lose fat",
  maintain: "Maintain",
  gain: "Build muscle",
};
