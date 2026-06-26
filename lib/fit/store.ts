// Client-side persistence for FitForge. All state lives in localStorage so the
// app works with zero backend. Exposes a small typed hook.
"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppState, DayNutrition, WorkoutSession } from "./types";

const KEY = "fitforge:v1";

const EMPTY: AppState = {
  profile: null,
  plan: null,
  workouts: {},
  nutrition: {},
  weight: [],
};

export function emptyNutrition(): DayNutrition {
  return { breakfast: [], lunch: [], dinner: [], snack: [], water: 0 };
}

export function todayISO(d: Date = new Date()): string {
  // Local-date ISO (yyyy-mm-dd), not UTC, so "today" matches the user's day.
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function load(): AppState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export function useFitStore() {
  const [state, setState] = useState<AppState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [state, hydrated]);

  const update = useCallback(
    (fn: (prev: AppState) => AppState) => setState((prev) => fn(prev)),
    []
  );

  const reset = useCallback(() => {
    setState(EMPTY);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { state, update, reset, hydrated };
}

export type FitStore = ReturnType<typeof useFitStore>;

// ---- small pure helpers used across views ----

export function getNutrition(state: AppState, iso: string): DayNutrition {
  return state.nutrition[iso] ?? emptyNutrition();
}

export function sumDay(day: DayNutrition) {
  const all = [...day.breakfast, ...day.lunch, ...day.dinner, ...day.snack];
  return all.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories * e.qty,
      protein: acc.protein + e.protein * e.qty,
      carbs: acc.carbs + e.carbs * e.qty,
      fat: acc.fat + e.fat * e.qty,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function isWorkoutComplete(s: WorkoutSession | undefined): boolean {
  return !!s?.completedAt;
}

/** Current consecutive-day workout streak ending today. */
export function workoutStreak(workouts: Record<string, WorkoutSession>): number {
  let streak = 0;
  const d = new Date();
  // Allow the streak to "start" yesterday if today isn't logged yet.
  if (!isWorkoutComplete(workouts[todayISO(d)])) {
    d.setDate(d.getDate() - 1);
  }
  while (isWorkoutComplete(workouts[todayISO(d)])) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
