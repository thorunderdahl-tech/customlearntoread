"use client";

import { useState } from "react";
import type { FitStore } from "@/lib/fit/store";
import { isWorkoutComplete, todayISO, workoutStreak } from "@/lib/fit/store";
import { displayWeight, lbToKg, weightUnit } from "@/lib/fit/calc";
import type { WeightPoint } from "@/lib/fit/types";

export default function ProgressView({ store }: { store: FitStore }) {
  const { profile } = store.state;
  const [val, setVal] = useState("");

  if (!profile) return null;
  const unit = weightUnit(profile.units);
  const points = [...store.state.weight].sort((a, b) => a.date.localeCompare(b.date));

  function logWeight() {
    const n = Number(val);
    if (!n || n <= 0) return;
    const kg = profile!.units === "imperial" ? lbToKg(n) : n;
    const iso = todayISO();
    store.update((prev) => {
      const others = prev.weight.filter((w) => w.date !== iso);
      const next: WeightPoint[] = [...others, { date: iso, kg: Math.round(kg * 10) / 10 }];
      return { ...prev, weight: next };
    });
    setVal("");
  }

  const completed = Object.values(store.state.workouts).filter(isWorkoutComplete);
  const streak = workoutStreak(store.state.workouts);

  const first = points[0];
  const latest = points[points.length - 1];
  const change =
    first && latest ? displayWeight(latest.kg, profile.units) - displayWeight(first.kg, profile.units) : 0;

  return (
    <>
      <h2 className="ff-section-title">Progress</h2>
      <p className="ff-sub" style={{ marginBottom: 18 }}>Track body weight and training consistency.</p>

      <div className="ff-grid cols-3" style={{ marginBottom: 18 }}>
        <Stat
          v={latest ? `${displayWeight(latest.kg, profile.units)}` : "—"}
          sub={unit}
          l="Current weight"
        />
        <Stat
          v={`${change >= 0 ? "+" : ""}${change.toFixed(1)}`}
          sub={unit}
          l="Total change"
          color={
            change === 0
              ? undefined
              : (profile.goal === "lose" ? change < 0 : change > 0)
              ? "var(--accent)"
              : "var(--warn)"
          }
        />
        <Stat v={`${streak}`} l="Current streak 🔥" />
      </div>

      <div className="ff-card" style={{ marginBottom: 18 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 14 }}>Body weight ({unit})</div>
        <WeightChart points={points} units={profile.units} />
        <div className="ff-divider" />
        <div className="ff-row" style={{ alignItems: "flex-end" }}>
          <div className="ff-field" style={{ marginBottom: 0 }}>
            <label>Log today&apos;s weight ({unit})</label>
            <input
              className="ff-input"
              type="number"
              step="0.1"
              placeholder={latest ? `${displayWeight(latest.kg, profile.units)}` : "—"}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logWeight()}
            />
          </div>
          <button className="ff-btn primary" onClick={logWeight}>Log</button>
        </div>
      </div>

      <div className="ff-card">
        <div className="ff-eyebrow" style={{ marginBottom: 12 }}>Recent workouts</div>
        {completed.length === 0 ? (
          <div className="ff-empty">
            <div className="ic">📋</div>
            No completed workouts yet. Finish a session to see it here.
          </div>
        ) : (
          completed
            .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
            .slice(0, 8)
            .map((s) => {
              const sets = s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
              const vol = s.exercises.reduce(
                (n, e) => n + e.sets.reduce((m, x) => m + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0),
                0
              );
              return (
                <div className="ff-food" key={s.completedAt}>
                  <div>
                    <div className="nm">{s.dayName}</div>
                    <div className="meta">
                      {new Date(s.completedAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {sets} sets
                    </div>
                  </div>
                  <span className="ff-pill muted">{Math.round(vol).toLocaleString()} {unit} volume</span>
                </div>
              );
            })
        )}
      </div>
    </>
  );
}

function Stat({ v, l, sub, color }: { v: string; l: string; sub?: string; color?: string }) {
  return (
    <div className="ff-card soft ff-stat">
      <div className="v" style={color ? { color } : undefined}>
        {v} {sub && <small>{sub}</small>}
      </div>
      <div className="l">{l}</div>
    </div>
  );
}

function WeightChart({ points, units }: { points: WeightPoint[]; units: "metric" | "imperial" }) {
  if (points.length < 2) {
    return (
      <div className="ff-empty" style={{ padding: "30px 10px" }}>
        <div className="ic">📈</div>
        Log your weight on at least two days to see your trend.
      </div>
    );
  }
  const W = 600;
  const H = 200;
  const pad = { l: 38, r: 12, t: 14, b: 24 };
  const vals = points.map((p) => displayWeight(p.kg, units));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const lo = min - range * 0.15;
  const hi = max + range * 0.15;

  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);

  const line = vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(vals.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const ticks = [hi, (hi + lo) / 2, lo];

  return (
    <svg className="ff-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ffArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid-line" x1={pad.l} y1={y(t)} x2={W - pad.r} y2={y(t)} />
          <text x={4} y={y(t) + 4} fill="var(--muted)" fontSize="11">
            {t.toFixed(0)}
          </text>
        </g>
      ))}
      <path className="area" d={area} />
      <path className="line" d={line} />
      {vals.map((v, i) => (
        <circle key={i} className="dot" cx={x(i)} cy={y(v)} r={i === vals.length - 1 ? 4 : 2.5} />
      ))}
    </svg>
  );
}
