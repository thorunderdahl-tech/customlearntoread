// Shared types for the FitForge workout + nutrition app.

export type Units = "metric" | "imperial";
export type Sex = "male" | "female";
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";
export type Goal = "lose" | "maintain" | "gain";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "full-gym" | "dumbbells" | "bodyweight";
export type Diet = "balanced" | "high-protein" | "low-carb" | "keto" | "vegan";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  units: Units;
  activity: Activity;
  goal: Goal;
  /** Target body-weight change in kg per week (always positive). */
  rate: number;
  experience: Experience;
  daysPerWeek: 3 | 4 | 5 | 6;
  equipment: Equipment;
  diet: Diet;
  createdAt: number;
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface PlanExercise {
  name: string;
  muscle: string;
  sets: number;
  reps: string; // e.g. "8-12" or "AMRAP"
}

export interface PlanDay {
  id: string;
  name: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface Plan {
  split: string;
  daysPerWeek: number;
  days: PlanDay[];
  generatedAt: number;
}

export interface LoggedSet {
  reps: number | "";
  weight: number | ""; // stored in the user's display unit at time of entry
  done: boolean;
}

export interface LoggedExercise {
  name: string;
  muscle: string;
  targetReps: string;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  dayId: string;
  dayName: string;
  exercises: LoggedExercise[];
  completedAt: number | null;
}

export interface FoodEntry {
  id: string;
  name: string;
  qty: number; // number of servings/units logged
  unit: string; // label, e.g. "100g" or "egg"
  calories: number; // per single unit
  protein: number;
  carbs: number;
  fat: number;
}

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface DayNutrition {
  breakfast: FoodEntry[];
  lunch: FoodEntry[];
  dinner: FoodEntry[];
  snack: FoodEntry[];
  water: number; // glasses
}

export interface WeightPoint {
  date: string; // ISO yyyy-mm-dd
  kg: number;
}

export interface AppState {
  profile: Profile | null;
  plan: Plan | null;
  /** keyed by ISO date yyyy-mm-dd */
  workouts: Record<string, WorkoutSession>;
  nutrition: Record<string, DayNutrition>;
  weight: WeightPoint[];
}
