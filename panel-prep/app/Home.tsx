"use client";

import { useState } from "react";
import InterviewClient from "./InterviewClient";
import Drills from "./Drills";
import Flashcards from "./Flashcards";

type Tab = "mock" | "drills" | "cards";

const TABS: Array<{ id: Tab; label: string; blurb: string }> = [
  { id: "mock", label: "Mock Panel", blurb: "Face the six" },
  { id: "drills", label: "Drills", blurb: "Reps to criterion" },
  { id: "cards", label: "Flashcards", blurb: "Know it cold" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("mock");

  // Keep all three mounted so a mock session survives a tab switch.
  return (
    <div>
      <nav className="pp-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`pp-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <strong>{t.label}</strong>
            <small>{t.blurb}</small>
          </button>
        ))}
      </nav>
      <div style={{ display: tab === "mock" ? "block" : "none" }}><InterviewClient /></div>
      <div style={{ display: tab === "drills" ? "block" : "none" }}><Drills /></div>
      <div style={{ display: tab === "cards" ? "block" : "none" }}><Flashcards /></div>

      <style>{`
        .pp-tabs {
          display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
          padding: 18px 20px 0;
        }
        .pp-tab {
          font: inherit; cursor: pointer; text-align: left;
          border: 1px solid var(--line); background: var(--paper);
          border-radius: 14px; padding: 10px 18px; display: grid; gap: 0;
          transition: border-color .15s;
        }
        .pp-tab:hover { border-color: var(--accent); }
        .pp-tab.active { background: var(--ink); border-color: var(--ink); }
        .pp-tab.active strong, .pp-tab.active small { color: #fff; }
        .pp-tab strong { font-size: 0.95rem; }
        .pp-tab small { color: var(--muted); font-size: 0.74rem; }
      `}</style>
    </div>
  );
}
