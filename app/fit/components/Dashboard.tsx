"use client";

import type { FitStore } from "@/lib/fit/store";
import {
  getNutrition,
  isWorkoutComplete,
  sumDay,
  todayISO,
  workoutStreak,
} from "@/lib/fit/store";
import { macroTargets, calorieTarget } from "@/lib/fit/calc";
import Ring from "./Ring";
import MacroBars from "./MacroBars";

export default function Dashboard({
  store,
  go,
}: {
  store: FitStore;
  go: (t: "workout" | "nutrition" | "progress" | "profile") => void;
}) {
  const { profile, plan } = store.state;
  if (!profile || !plan) return null;

  const iso = todayISO();
  const targets = macroTargets(profile);
  const eaten = sumDay(getNutrition(store.state, iso));
  const remaining = Math.max(0, targets.calories - eaten.calories);

  // Pick "today's" workout: the session in progress, else the next day in rotation.
  const session = store.state.workouts[iso];
  const completedCount = Object.values(store.state.workouts).filter(isWorkoutComplete).length;
  const todayDay =
    session
      ? plan.days.find((d) => d.id === session.dayId) ?? plan.days[0]
      : plan.days[completedCount % plan.days.length];

  const streak = workoutStreak(store.state.workouts);
  const done = isWorkoutComplete(session);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div className="ff-eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <h2 className="ff-section-title" style={{ marginTop: 4 }}>
          Your day at a glance
        </h2>
      </div>

      <div className="ff-grid cols-2">
        {/* Nutrition card */}
        <div className="ff-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="ff-eyebrow">Nutrition</div>
            <span className="ff-pill green">{remaining} kcal left</span>
          </div>
          <div className="ff-rings">
            <Ring
              value={eaten.calories}
              max={targets.calories}
              label="of"
              unit={`${targets.calories}`}
              size={132}
            />
            <div style={{ flex: 1, minWidth: 160 }}>
              <MacroBars
                protein={[eaten.protein, targets.protein]}
                carbs={[eaten.carbs, targets.carbs]}
                fat={[eaten.fat, targets.fat]}
              />
            </div>
          </div>
          <div className="ff-divider" />
          <button className="ff-btn primary block" onClick={() => go("nutrition")}>
            Log food
          </button>
        </div>

        {/* Workout card */}
        <div className="ff-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="ff-eyebrow">Today&apos;s training</div>
            {done ? (
              <span className="ff-pill green">✓ Complete</span>
            ) : (
              <span className="ff-pill blue">{plan.split}</span>
            )}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {todayDay.name}
          </div>
          <div className="ff-sub" style={{ marginBottom: 12 }}>
            {todayDay.focus} · {todayDay.exercises.length} exercises
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {todayDay.exercises.slice(0, 5).map((e) => (
              <span key={e.name} className="ff-pill muted">
                {e.name}
              </span>
            ))}
          </div>
          <div className="ff-divider" />
          <button className="ff-btn primary block" onClick={() => go("workout")}>
            {done ? "Review workout" : session ? "Resume workout" : "Start workout"}
          </button>
        </div>
      </div>

      <div className="ff-spacer" />

      <div className="ff-grid cols-4">
        <Stat v={`${streak}`} l="Day streak 🔥" />
        <Stat v={`${completedCount}`} l="Workouts done" />
        <Stat v={`${calorieTarget(profile)}`} l="Daily target" sub="kcal" />
        <Stat v={`${targets.protein}g`} l="Protein goal" />
      </div>
    </>
  );
}

function Stat({ v, l, sub }: { v: string; l: string; sub?: string }) {
  return (
    <div className="ff-card soft ff-stat">
      <div className="v">
        {v} {sub && <small>{sub}</small>}
      </div>
      <div className="l">{l}</div>
    </div>
  );
}
