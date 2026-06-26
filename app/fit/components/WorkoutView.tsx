"use client";

import { useState } from "react";
import type { FitStore } from "@/lib/fit/store";
import { isWorkoutComplete, todayISO } from "@/lib/fit/store";
import { weightUnit } from "@/lib/fit/calc";
import type { LoggedExercise, PlanDay, WorkoutSession } from "@/lib/fit/types";

function buildSession(day: PlanDay): WorkoutSession {
  const exercises: LoggedExercise[] = day.exercises.map((e) => ({
    name: e.name,
    muscle: e.muscle,
    targetReps: e.reps,
    sets: Array.from({ length: e.sets }, () => ({ reps: "" as const, weight: "" as const, done: false })),
  }));
  return { dayId: day.id, dayName: day.name, exercises, completedAt: null };
}

export default function WorkoutView({ store }: { store: FitStore }) {
  const { profile, plan } = store.state;
  const iso = todayISO();
  const session = store.state.workouts[iso];
  const [picking, setPicking] = useState(!session);

  if (!profile || !plan) return null;
  const unit = weightUnit(profile.units);

  function startDay(day: PlanDay) {
    store.update((prev) => ({
      ...prev,
      workouts: { ...prev.workouts, [iso]: buildSession(day) },
    }));
    setPicking(false);
  }

  if (picking || !session) {
    const completedCount = Object.values(store.state.workouts).filter(isWorkoutComplete).length;
    const suggested = plan.days[completedCount % plan.days.length].id;
    return (
      <>
        <h2 className="ff-section-title">Choose today&apos;s session</h2>
        <p className="ff-sub" style={{ marginBottom: 18 }}>
          {plan.split} · {plan.daysPerWeek} days/week
        </p>
        <div className="ff-grid cols-2">
          {plan.days.map((day) => (
            <div className="ff-card" key={day.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{day.name}</div>
                {day.id === suggested && <span className="ff-pill green">Next up</span>}
              </div>
              <div className="ff-sub" style={{ marginBottom: 10 }}>{day.focus}</div>
              <ul style={{ margin: "0 0 14px", paddingLeft: 18, color: "var(--muted)", fontSize: 13.5 }}>
                {day.exercises.map((e) => (
                  <li key={e.name} style={{ marginBottom: 3 }}>
                    {e.name} — {e.sets}×{e.reps}
                  </li>
                ))}
              </ul>
              <button className="ff-btn primary block" onClick={() => startDay(day)}>
                Start {day.name.split("—")[0].trim()}
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  function patchSet(exi: number, seti: number, patch: Partial<{ reps: number | ""; weight: number | ""; done: boolean }>) {
    store.update((prev) => {
      const s = prev.workouts[iso];
      if (!s) return prev;
      const exercises = s.exercises.map((ex, i) => {
        if (i !== exi) return ex;
        const sets = ex.sets.map((set, j) => (j === seti ? { ...set, ...patch } : set));
        return { ...ex, sets };
      });
      return { ...prev, workouts: { ...prev.workouts, [iso]: { ...s, exercises } } };
    });
  }

  function addSet(exi: number) {
    store.update((prev) => {
      const s = prev.workouts[iso];
      if (!s) return prev;
      const exercises = s.exercises.map((ex, i) =>
        i === exi ? { ...ex, sets: [...ex.sets, { reps: "" as const, weight: "" as const, done: false }] } : ex
      );
      return { ...prev, workouts: { ...prev.workouts, [iso]: { ...s, exercises } } };
    });
  }

  function finish() {
    store.update((prev) => {
      const s = prev.workouts[iso];
      if (!s) return prev;
      return { ...prev, workouts: { ...prev.workouts, [iso]: { ...s, completedAt: Date.now() } } };
    });
  }

  const complete = isWorkoutComplete(session);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 12 }}>
        <div>
          <h2 className="ff-section-title">{session.dayName}</h2>
          <p className="ff-sub">{doneSets}/{totalSets} sets logged</p>
        </div>
        <button className="ff-btn ghost sm" onClick={() => setPicking(true)}>
          Switch day
        </button>
      </div>

      <div className="ff-bar" style={{ marginBottom: 20 }}>
        <span style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, background: "var(--accent)" }} />
      </div>

      {session.exercises.map((ex, exi) => (
        <div className="ff-ex" key={ex.name}>
          <div className="ff-ex-head">
            <div>
              <div className="nm">{ex.name}</div>
              <div className="ms">{ex.muscle}</div>
            </div>
            <div className="tg">Target {ex.targetReps} reps</div>
          </div>

          <div className="ff-set-row" style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>
            <span className="si">#</span>
            <span>Weight ({unit})</span>
            <span>Reps</span>
            <span style={{ textAlign: "center" }}>✓</span>
          </div>

          {ex.sets.map((set, seti) => (
            <div className="ff-set-row" key={seti}>
              <span className="si">{seti + 1}</span>
              <input
                className="ff-mini"
                type="number"
                inputMode="decimal"
                placeholder="—"
                value={set.weight}
                onChange={(e) =>
                  patchSet(exi, seti, { weight: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
              <input
                className="ff-mini"
                type="number"
                inputMode="numeric"
                placeholder={ex.targetReps}
                value={set.reps}
                onChange={(e) =>
                  patchSet(exi, seti, { reps: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
              <button
                className={`ff-check${set.done ? " on" : ""}`}
                onClick={() => patchSet(exi, seti, { done: !set.done })}
                aria-label="mark set done"
              >
                ✓
              </button>
            </div>
          ))}

          <button className="ff-btn ghost sm" style={{ marginTop: 4 }} onClick={() => addSet(exi)}>
            + Add set
          </button>
        </div>
      ))}

      <div className="ff-spacer" />
      {complete ? (
        <div className="ff-card soft" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>💪</div>
          <div style={{ fontWeight: 800, fontSize: 18, margin: "6px 0" }}>Session complete</div>
          <p className="ff-sub">Logged at {new Date(session.completedAt!).toLocaleTimeString()}. Nice work.</p>
        </div>
      ) : (
        <button className="ff-btn primary block" onClick={finish}>
          Finish & log workout
        </button>
      )}
    </>
  );
}
