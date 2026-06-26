"use client";

import { useState } from "react";
import type { FitStore } from "@/lib/fit/store";
import { generatePlan } from "@/lib/fit/plan";
import { inToCm, lbToKg } from "@/lib/fit/calc";
import type {
  Activity,
  Diet,
  Equipment,
  Experience,
  Goal,
  Profile,
  Sex,
  Units,
} from "@/lib/fit/types";

interface Draft {
  name: string;
  sex: Sex;
  age: string;
  units: Units;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string; // in display unit
  activity: Activity;
  goal: Goal;
  rate: number;
  experience: Experience;
  daysPerWeek: 3 | 4 | 5 | 6;
  equipment: Equipment;
  diet: Diet;
}

const START: Draft = {
  name: "",
  sex: "male",
  age: "28",
  units: "imperial",
  heightCm: "175",
  heightFt: "5",
  heightIn: "9",
  weight: "175",
  activity: "moderate",
  goal: "lose",
  rate: 0.5,
  experience: "beginner",
  daysPerWeek: 4,
  equipment: "full-gym",
  diet: "high-protein",
};

export default function Onboarding({ store }: { store: FitStore }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(START);
  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));

  const steps = ["You", "Goals", "Training", "Nutrition"];
  const last = steps.length - 1;

  function finish() {
    const heightCm =
      d.units === "imperial"
        ? inToCm(Number(d.heightFt) * 12 + Number(d.heightIn))
        : Number(d.heightCm);
    const weightKg =
      d.units === "imperial" ? lbToKg(Number(d.weight)) : Number(d.weight);

    const profile: Profile = {
      name: d.name.trim() || "Athlete",
      sex: d.sex,
      age: Math.max(13, Math.min(90, Number(d.age) || 28)),
      heightCm: Math.round(heightCm),
      weightKg: Math.round(weightKg * 10) / 10,
      units: d.units,
      activity: d.activity,
      goal: d.goal,
      rate: d.goal === "maintain" ? 0 : d.rate,
      experience: d.experience,
      daysPerWeek: d.daysPerWeek,
      equipment: d.equipment,
      diet: d.diet,
      createdAt: Date.now(),
    };
    const plan = generatePlan(profile);
    store.update((prev) => ({
      ...prev,
      profile,
      plan,
      weight: [{ date: new Date().toISOString().slice(0, 10), kg: profile.weightKg }],
    }));
  }

  const canNext =
    step !== 0 || (d.name.trim().length > 0 && Number(d.age) > 0 && Number(d.weight) > 0);

  return (
    <div className="ff-onb">
      <div className="ff-brand" style={{ marginBottom: 18 }}>
        <span className="ff-logo">F</span>
        <span>FitForge</span>
      </div>
      <h1 className="ff-hero-h">Let&apos;s build your plan</h1>
      <p className="ff-sub" style={{ marginBottom: 22 }}>
        Four quick steps. Everything is tuned to your body, goals and gear — and
        stored only on this device.
      </p>

      <div className="ff-steps">
        {steps.map((_, i) => (
          <div key={i} className={`ff-step-dot${i <= step ? " on" : ""}`} />
        ))}
      </div>

      <div className="ff-card">
        <div className="ff-eyebrow">
          Step {step + 1} / {steps.length} · {steps[step]}
        </div>
        <div className="ff-spacer" />

        {step === 0 && <StepYou d={d} set={set} />}
        {step === 1 && <StepGoals d={d} set={set} />}
        {step === 2 && <StepTraining d={d} set={set} />}
        {step === 3 && <StepNutrition d={d} set={set} />}

        <div className="ff-divider" />
        <div className="ff-row">
          {step > 0 && (
            <button className="ff-btn ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < last ? (
            <button
              className="ff-btn primary"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="ff-btn primary" onClick={finish}>
              Generate my plan →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ff-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function StepYou({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <Field label="What should we call you?">
        <input
          className="ff-input"
          placeholder="Your name"
          value={d.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <div className="ff-field">
        <label>Units</label>
        <div className="ff-toggle">
          <button
            className={d.units === "imperial" ? "on" : ""}
            onClick={() => set({ units: "imperial" })}
          >
            lb / ft
          </button>
          <button
            className={d.units === "metric" ? "on" : ""}
            onClick={() => set({ units: "metric" })}
          >
            kg / cm
          </button>
        </div>
      </div>

      <div className="ff-row">
        <Field label="Sex (for BMR)">
          <select
            className="ff-select"
            value={d.sex}
            onChange={(e) => set({ sex: e.target.value as Sex })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Age">
          <input
            className="ff-input"
            type="number"
            value={d.age}
            onChange={(e) => set({ age: e.target.value })}
          />
        </Field>
      </div>

      {d.units === "imperial" ? (
        <div className="ff-row">
          <Field label="Height (ft)">
            <input
              className="ff-input"
              type="number"
              value={d.heightFt}
              onChange={(e) => set({ heightFt: e.target.value })}
            />
          </Field>
          <Field label="Height (in)">
            <input
              className="ff-input"
              type="number"
              value={d.heightIn}
              onChange={(e) => set({ heightIn: e.target.value })}
            />
          </Field>
          <Field label="Weight (lb)">
            <input
              className="ff-input"
              type="number"
              value={d.weight}
              onChange={(e) => set({ weight: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="ff-row">
          <Field label="Height (cm)">
            <input
              className="ff-input"
              type="number"
              value={d.heightCm}
              onChange={(e) => set({ heightCm: e.target.value })}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              className="ff-input"
              type="number"
              value={d.weight}
              onChange={(e) => set({ weight: e.target.value })}
            />
          </Field>
        </div>
      )}
    </>
  );
}

const ACTIVITIES: { v: Activity; t: string; d: string }[] = [
  { v: "sedentary", t: "Sedentary", d: "Desk job, little movement" },
  { v: "light", t: "Lightly active", d: "Light exercise 1–3×/wk" },
  { v: "moderate", t: "Moderately active", d: "Exercise 3–5×/wk" },
  { v: "active", t: "Very active", d: "Hard exercise 6–7×/wk" },
  { v: "veryActive", t: "Athlete", d: "Physical job / 2× daily" },
];

function StepGoals({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const goals: { v: Goal; t: string; d: string }[] = [
    { v: "lose", t: "Lose fat", d: "Calorie deficit + lifting" },
    { v: "maintain", t: "Maintain", d: "Stay where you are" },
    { v: "gain", t: "Build muscle", d: "Lean surplus + lifting" },
  ];
  return (
    <>
      <div className="ff-field">
        <label>Primary goal</label>
        <div className="ff-choice-grid">
          {goals.map((g) => (
            <button
              key={g.v}
              className={`ff-choice${d.goal === g.v ? " active" : ""}`}
              onClick={() => set({ goal: g.v })}
            >
              <div className="t">{g.t}</div>
              <div className="d">{g.d}</div>
            </button>
          ))}
        </div>
      </div>

      {d.goal !== "maintain" && (
        <Field
          label={`Target pace — ${d.rate} ${d.units === "imperial" ? "lb" : "kg"}/week ${
            d.goal === "lose" ? "loss" : "gain"
          }`}
        >
          <input
            type="range"
            min={0.25}
            max={d.goal === "gain" ? 0.5 : 1}
            step={0.25}
            value={d.rate}
            onChange={(e) => set({ rate: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div className="ff-sub" style={{ fontSize: 12 }}>
            {d.goal === "lose"
              ? "0.25–1 lb/week is sustainable. Faster risks muscle loss."
              : "0.25–0.5 lb/week keeps the surplus lean."}
          </div>
        </Field>
      )}

      <div className="ff-field">
        <label>Daily activity (outside workouts)</label>
        {ACTIVITIES.map((a) => (
          <button
            key={a.v}
            className={`ff-choice${d.activity === a.v ? " active" : ""}`}
            style={{ marginBottom: 8 }}
            onClick={() => set({ activity: a.v })}
          >
            <div className="t">{a.t}</div>
            <div className="d">{a.d}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepTraining({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const exp: { v: Experience; t: string }[] = [
    { v: "beginner", t: "Beginner" },
    { v: "intermediate", t: "Intermediate" },
    { v: "advanced", t: "Advanced" },
  ];
  const equip: { v: Equipment; t: string; d: string }[] = [
    { v: "full-gym", t: "Full gym", d: "Barbells, machines, cables" },
    { v: "dumbbells", t: "Dumbbells", d: "Home setup with weights" },
    { v: "bodyweight", t: "Bodyweight", d: "No equipment needed" },
  ];
  return (
    <>
      <div className="ff-field">
        <label>Experience level</label>
        <div className="ff-choice-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {exp.map((x) => (
            <button
              key={x.v}
              className={`ff-choice${d.experience === x.v ? " active" : ""}`}
              onClick={() => set({ experience: x.v })}
            >
              <div className="t">{x.t}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="ff-field">
        <label>Days per week you can train</label>
        <div className="ff-choice-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          {[3, 4, 5, 6].map((n) => (
            <button
              key={n}
              className={`ff-choice${d.daysPerWeek === n ? " active" : ""}`}
              style={{ textAlign: "center" }}
              onClick={() => set({ daysPerWeek: n as 3 | 4 | 5 | 6 })}
            >
              <div className="t" style={{ fontSize: 20 }}>
                {n}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="ff-field">
        <label>Equipment available</label>
        {equip.map((x) => (
          <button
            key={x.v}
            className={`ff-choice${d.equipment === x.v ? " active" : ""}`}
            style={{ marginBottom: 8 }}
            onClick={() => set({ equipment: x.v })}
          >
            <div className="t">{x.t}</div>
            <div className="d">{x.d}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepNutrition({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const diets: { v: Diet; t: string; d: string }[] = [
    { v: "balanced", t: "Balanced", d: "Even macro split" },
    { v: "high-protein", t: "High protein", d: "Best for building/cutting" },
    { v: "low-carb", t: "Low carb", d: "Fewer carbs, more fat" },
    { v: "keto", t: "Keto", d: "Very low carb" },
    { v: "vegan", t: "Plant-based", d: "Vegan-friendly targets" },
  ];
  return (
    <div className="ff-field">
      <label>Diet style (sets your macro split)</label>
      {diets.map((x) => (
        <button
          key={x.v}
          className={`ff-choice${d.diet === x.v ? " active" : ""}`}
          style={{ marginBottom: 8 }}
          onClick={() => set({ diet: x.v })}
        >
          <div className="t">{x.t}</div>
          <div className="d">{x.d}</div>
        </button>
      ))}
    </div>
  );
}
