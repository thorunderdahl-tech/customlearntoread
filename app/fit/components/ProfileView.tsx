"use client";

import type { FitStore } from "@/lib/fit/store";
import { generatePlan } from "@/lib/fit/plan";
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  bmr,
  calorieTarget,
  displayWeight,
  macroTargets,
  tdee,
  weightUnit,
} from "@/lib/fit/calc";
import type { Activity, Diet, Goal, Profile } from "@/lib/fit/types";

export default function ProfileView({ store }: { store: FitStore }) {
  const { profile } = store.state;
  if (!profile) return null;
  const unit = weightUnit(profile.units);
  const targets = macroTargets(profile);

  function patch(p: Partial<Profile>) {
    store.update((prev) => {
      if (!prev.profile) return prev;
      const profile = { ...prev.profile, ...p };
      // Regenerate the plan when anything that shapes it changes.
      const planChanged =
        p.daysPerWeek !== undefined ||
        p.equipment !== undefined ||
        p.goal !== undefined ||
        p.experience !== undefined;
      return {
        ...prev,
        profile,
        plan: planChanged ? generatePlan(profile) : prev.plan,
      };
    });
  }

  function regenerate() {
    store.update((prev) => (prev.profile ? { ...prev, plan: generatePlan(prev.profile) } : prev));
  }

  return (
    <>
      <h2 className="ff-section-title">Your plan</h2>
      <p className="ff-sub" style={{ marginBottom: 18 }}>
        Adjust anything and your targets + workout split recalculate instantly.
      </p>

      <div className="ff-card" style={{ marginBottom: 18 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 12 }}>Calculated targets</div>
        <div className="ff-grid cols-4">
          <Mini v={`${bmr(profile)}`} l="BMR" />
          <Mini v={`${tdee(profile)}`} l="Maintenance" />
          <Mini v={`${calorieTarget(profile)}`} l="Daily target" />
          <Mini v={`${displayWeight(profile.weightKg, profile.units)} ${unit}`} l="Body weight" />
        </div>
        <div className="ff-divider" />
        <div className="ff-grid cols-3">
          <Mini v={`${targets.protein}g`} l="Protein" color="var(--protein)" />
          <Mini v={`${targets.carbs}g`} l="Carbs" color="var(--carbs)" />
          <Mini v={`${targets.fat}g`} l="Fat" color="var(--fat)" />
        </div>
      </div>

      <div className="ff-card" style={{ marginBottom: 18 }}>
        <div className="ff-eyebrow" style={{ marginBottom: 14 }}>Adjust</div>

        <Select
          label="Goal"
          value={profile.goal}
          onChange={(v) => patch({ goal: v as Goal, rate: v === "maintain" ? 0 : profile.rate || 0.5 })}
          options={Object.entries(GOAL_LABEL).map(([v, t]) => ({ v, t }))}
        />
        <Select
          label="Daily activity"
          value={profile.activity}
          onChange={(v) => patch({ activity: v as Activity })}
          options={Object.entries(ACTIVITY_LABEL).map(([v, t]) => ({ v, t }))}
        />
        <Select
          label="Diet style"
          value={profile.diet}
          onChange={(v) => patch({ diet: v as Diet })}
          options={[
            { v: "balanced", t: "Balanced" },
            { v: "high-protein", t: "High protein" },
            { v: "low-carb", t: "Low carb" },
            { v: "keto", t: "Keto" },
            { v: "vegan", t: "Plant-based" },
          ]}
        />

        <div className="ff-row">
          <Select
            label="Training days / week"
            value={String(profile.daysPerWeek)}
            onChange={(v) => patch({ daysPerWeek: Number(v) as 3 | 4 | 5 | 6 })}
            options={[3, 4, 5, 6].map((n) => ({ v: String(n), t: `${n} days` }))}
          />
          <Select
            label="Equipment"
            value={profile.equipment}
            onChange={(v) => patch({ equipment: v as Profile["equipment"] })}
            options={[
              { v: "full-gym", t: "Full gym" },
              { v: "dumbbells", t: "Dumbbells" },
              { v: "bodyweight", t: "Bodyweight" },
            ]}
          />
        </div>

        <Select
          label="Experience"
          value={profile.experience}
          onChange={(v) => patch({ experience: v as Profile["experience"] })}
          options={[
            { v: "beginner", t: "Beginner" },
            { v: "intermediate", t: "Intermediate" },
            { v: "advanced", t: "Advanced" },
          ]}
        />

        <button className="ff-btn ghost block" onClick={regenerate}>
          🔄 Shuffle workout exercises
        </button>
      </div>

      <div className="ff-card">
        <div className="ff-eyebrow" style={{ marginBottom: 8 }}>Data</div>
        <p className="ff-sub" style={{ marginBottom: 14 }}>
          Everything lives in this browser only — nothing is sent anywhere. Clearing resets the app.
        </p>
        <button
          className="ff-btn danger"
          onClick={() => {
            if (confirm("Reset FitForge? This erases your profile, plan and all logs.")) store.reset();
          }}
        >
          Reset all data
        </button>
      </div>
    </>
  );
}

function Mini({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <div className="ff-stat">
      <div className="v" style={{ fontSize: 22, ...(color ? { color } : {}) }}>{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; t: string }[];
}) {
  return (
    <div className="ff-field">
      <label>{label}</label>
      <select className="ff-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </div>
  );
}
