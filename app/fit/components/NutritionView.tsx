"use client";

import { useMemo, useState } from "react";
import type { FitStore } from "@/lib/fit/store";
import { emptyNutrition, getNutrition, sumDay, todayISO } from "@/lib/fit/store";
import { macroTargets } from "@/lib/fit/calc";
import { FOODS, type Food } from "@/lib/fit/foods";
import type { FoodEntry, Meal } from "@/lib/fit/types";
import Ring from "./Ring";
import MacroBars from "./MacroBars";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

let counter = 0;
const newId = () => `f${Date.now()}_${counter++}`;

export default function NutritionView({ store }: { store: FitStore }) {
  const { profile } = store.state;
  const iso = todayISO();
  const day = getNutrition(store.state, iso);
  const [adding, setAdding] = useState<Meal | null>(null);

  if (!profile) return null;
  const targets = macroTargets(profile);
  const eaten = sumDay(day);

  function addEntry(meal: Meal, entry: FoodEntry) {
    store.update((prev) => {
      const d = prev.nutrition[iso] ?? emptyNutrition();
      return {
        ...prev,
        nutrition: { ...prev.nutrition, [iso]: { ...d, [meal]: [...d[meal], entry] } },
      };
    });
  }

  function removeEntry(meal: Meal, id: string) {
    store.update((prev) => {
      const d = prev.nutrition[iso] ?? emptyNutrition();
      return {
        ...prev,
        nutrition: { ...prev.nutrition, [iso]: { ...d, [meal]: d[meal].filter((e) => e.id !== id) } },
      };
    });
  }

  function setWater(n: number) {
    store.update((prev) => {
      const d = prev.nutrition[iso] ?? emptyNutrition();
      return { ...prev, nutrition: { ...prev.nutrition, [iso]: { ...d, water: Math.max(0, n) } } };
    });
  }

  return (
    <>
      <h2 className="ff-section-title">Today&apos;s nutrition</h2>
      <p className="ff-sub" style={{ marginBottom: 18 }}>
        Target {targets.calories} kcal · {profile.diet.replace("-", " ")} macros
      </p>

      <div className="ff-card" style={{ marginBottom: 18 }}>
        <div className="ff-rings">
          <Ring value={eaten.calories} max={targets.calories} label="of" unit={`${targets.calories} kcal`} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <MacroBars
              protein={[eaten.protein, targets.protein]}
              carbs={[eaten.carbs, targets.carbs]}
              fat={[eaten.fat, targets.fat]}
            />
            <div className="ff-divider" />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="ff-sub">💧 Water</span>
              <button className="ff-btn ghost sm" onClick={() => setWater(day.water - 1)}>−</button>
              <strong>{day.water}</strong>
              <button className="ff-btn ghost sm" onClick={() => setWater(day.water + 1)}>+</button>
              <span className="ff-sub">glasses</span>
            </div>
          </div>
        </div>
      </div>

      {MEALS.map((meal) => {
        const entries = day[meal];
        const kcal = entries.reduce((n, e) => n + e.calories * e.qty, 0);
        return (
          <div className="ff-card ff-meal" key={meal}>
            <div className="ff-meal-head">
              <span className="title">{meal}</span>
              <span className="kcal">{Math.round(kcal)} kcal</span>
            </div>

            {entries.length === 0 && adding !== meal && (
              <p className="ff-sub" style={{ fontSize: 13 }}>Nothing logged yet.</p>
            )}

            {entries.map((e) => (
              <div className="ff-food" key={e.id}>
                <div>
                  <div className="nm">{e.name}</div>
                  <div className="meta">
                    {e.qty} × {e.unit} · {Math.round(e.calories * e.qty)} kcal
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="macros">
                    P{Math.round(e.protein * e.qty)} C{Math.round(e.carbs * e.qty)} F{Math.round(e.fat * e.qty)}
                  </span>
                  <button className="ff-x" onClick={() => removeEntry(meal, e.id)} aria-label="remove">
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {adding === meal ? (
              <AddFood
                onAdd={(entry) => addEntry(meal, entry)}
                onClose={() => setAdding(null)}
              />
            ) : (
              <button className="ff-btn ghost sm" style={{ marginTop: 10 }} onClick={() => setAdding(meal)}>
                + Add food
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

function AddFood({ onAdd, onClose }: { onAdd: (e: FoodEntry) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [qty, setQty] = useState("1");
  const [picked, setPicked] = useState<Food | null>(null);
  const [custom, setCustom] = useState(false);
  const [c, setC] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", unit: "serving" });

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return FOODS.filter((f) => f.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q]);

  function commit() {
    const quantity = Math.max(0.1, Number(qty) || 1);
    if (custom) {
      onAdd({
        id: newId(),
        name: c.name.trim() || "Custom food",
        qty: quantity,
        unit: c.unit || "serving",
        calories: Number(c.calories) || 0,
        protein: Number(c.protein) || 0,
        carbs: Number(c.carbs) || 0,
        fat: Number(c.fat) || 0,
      });
    } else if (picked) {
      onAdd({
        id: newId(),
        name: picked.name,
        qty: quantity,
        unit: picked.unit,
        calories: picked.calories,
        protein: picked.protein,
        carbs: picked.carbs,
        fat: picked.fat,
      });
    } else {
      return;
    }
    onClose();
  }

  return (
    <div className="ff-card soft" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="ff-eyebrow">{custom ? "Custom food" : "Search foods"}</div>
        <button className="ff-x" onClick={onClose}>✕</button>
      </div>

      {!custom ? (
        <>
          <div className="ff-search">
            <input
              className="ff-input"
              autoFocus
              placeholder="e.g. chicken, rice, banana…"
              value={picked ? picked.name : q}
              onChange={(e) => {
                setPicked(null);
                setQ(e.target.value);
              }}
            />
            {!picked && results.length > 0 && (
              <div className="ff-results">
                {results.map((f) => (
                  <div
                    className="ff-result"
                    key={f.name}
                    onClick={() => {
                      setPicked(f);
                      setQ("");
                    }}
                  >
                    <span className="nm">{f.name}</span>
                    <span className="meta">
                      {f.calories} kcal / {f.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {picked && (
            <div className="ff-row" style={{ marginTop: 12, alignItems: "flex-end" }}>
              <div className="ff-field" style={{ marginBottom: 0 }}>
                <label>Quantity ({picked.unit})</label>
                <input
                  className="ff-input"
                  type="number"
                  step="0.25"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <button className="ff-btn primary" onClick={commit}>
                Add ({Math.round(picked.calories * (Number(qty) || 1))} kcal)
              </button>
            </div>
          )}

          <button className="ff-btn ghost sm" style={{ marginTop: 12 }} onClick={() => setCustom(true)}>
            Can&apos;t find it? Enter manually
          </button>
        </>
      ) : (
        <>
          <div className="ff-field">
            <label>Food name</label>
            <input className="ff-input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          </div>
          <div className="ff-row">
            <div className="ff-field">
              <label>Calories</label>
              <input className="ff-input" type="number" value={c.calories} onChange={(e) => setC({ ...c, calories: e.target.value })} />
            </div>
            <div className="ff-field">
              <label>Protein (g)</label>
              <input className="ff-input" type="number" value={c.protein} onChange={(e) => setC({ ...c, protein: e.target.value })} />
            </div>
          </div>
          <div className="ff-row">
            <div className="ff-field">
              <label>Carbs (g)</label>
              <input className="ff-input" type="number" value={c.carbs} onChange={(e) => setC({ ...c, carbs: e.target.value })} />
            </div>
            <div className="ff-field">
              <label>Fat (g)</label>
              <input className="ff-input" type="number" value={c.fat} onChange={(e) => setC({ ...c, fat: e.target.value })} />
            </div>
          </div>
          <div className="ff-row" style={{ alignItems: "flex-end" }}>
            <div className="ff-field" style={{ marginBottom: 0 }}>
              <label>Servings</label>
              <input className="ff-input" type="number" step="0.25" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <button className="ff-btn primary" onClick={commit}>Add</button>
          </div>
          <button className="ff-btn ghost sm" style={{ marginTop: 12 }} onClick={() => setCustom(false)}>
            ← Back to search
          </button>
        </>
      )}
    </div>
  );
}
