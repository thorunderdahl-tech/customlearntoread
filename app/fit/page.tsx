"use client";

import { useState } from "react";
import { useFitStore } from "@/lib/fit/store";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import WorkoutView from "./components/WorkoutView";
import NutritionView from "./components/NutritionView";
import ProgressView from "./components/ProgressView";
import ProfileView from "./components/ProfileView";

type Tab = "dashboard" | "workout" | "nutrition" | "progress" | "profile";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Today", icon: "◎" },
  { id: "workout", label: "Workout", icon: "🏋" },
  { id: "nutrition", label: "Nutrition", icon: "🍽" },
  { id: "progress", label: "Progress", icon: "📈" },
  { id: "profile", label: "Profile", icon: "⚙" },
];

export default function FitPage() {
  const store = useFitStore();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!store.hydrated) {
    return (
      <div className="ff-shell" style={{ paddingTop: 80 }}>
        <div className="ff-sub">Loading…</div>
      </div>
    );
  }

  if (!store.state.profile || !store.state.plan) {
    return <Onboarding store={store} />;
  }

  const { profile } = store.state;
  const first = profile.name.split(" ")[0] || "athlete";

  return (
    <>
      <div className="ff-top">
        <div className="ff-brand">
          <span className="ff-logo">F</span>
          <span>
            FitForge <small>· {profile.goal === "lose" ? "Cut" : profile.goal === "gain" ? "Bulk" : "Recomp"}</small>
          </span>
        </div>
        <div className="ff-top-right">
          <span className="ff-hello">Hi, {first} 👋</span>
        </div>
      </div>

      <nav className="ff-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ff-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="ff-shell">
        {tab === "dashboard" && <Dashboard store={store} go={setTab} />}
        {tab === "workout" && <WorkoutView store={store} />}
        {tab === "nutrition" && <NutritionView store={store} />}
        {tab === "progress" && <ProgressView store={store} />}
        {tab === "profile" && <ProfileView store={store} />}
      </main>
    </>
  );
}
