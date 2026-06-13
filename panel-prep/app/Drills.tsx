"use client";

// Reps-to-criterion trainer: deliver spine content from a bare headline,
// by voice where supported. Three clean reps retires an item for the day;
// everything resurfaces tomorrow. Progress lives in localStorage.

import { useEffect, useRef, useState } from "react";
import { DRILL_ITEMS, type DrillItem } from "@/lib/drills";
import { useSpeech, countFillers } from "@/lib/speech";
import { todayStr } from "@/lib/cards";

const STORE_KEY = "pp-drills";
const GOAL = 3;

type Progress = Record<string, { date: string; cleans: number }>;

function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Progress;
    // Daily reset: stale entries count zero today.
    for (const k of Object.keys(p)) if (p[k].date !== todayStr()) p[k] = { date: todayStr(), cleans: 0 };
    return p;
  } catch {
    return {};
  }
}

function saveProgress(p: Progress) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch {}
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Result = { clean: boolean; missed: string[]; note: string } | null;

export default function Drills() {
  const [progress, setProgress] = useState<Progress>({});
  const [active, setActive] = useState<DrillItem | null>(null);
  const [phase, setPhase] = useState<"ready" | "countdown" | "live" | "checking" | "result" | "selfgrade">("ready");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [rep, setRep] = useState("");
  const [repSec, setRepSec] = useState(0);
  const [fillers, setFillers] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");
  const speech = useSpeech();
  const startRef = useRef(0);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      beginLive();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "live" && speech.listening) setRep(speech.transcript);
  }, [speech.transcript, speech.listening, phase]);

  function startRep(item: DrillItem) {
    setActive(item);
    setRep("");
    setRepSec(0);
    setFillers(0);
    setResult(null);
    setError("");
    setElapsed(0);
    setCountdown(3);
    setPhase("countdown");
  }

  function beginLive() {
    startRef.current = Date.now();
    setPhase("live");
    if (speech.supported) speech.start();
  }

  async function finishRep() {
    speech.stop();
    const sec = Math.round((Date.now() - startRef.current) / 1000);
    setRepSec(sec);
    setFillers(countFillers(rep));
    if (!rep.trim() || !active) {
      setPhase("ready");
      setActive(null);
      return;
    }
    setPhase("checking");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "drill", drillId: active.id, rep, seconds: sec }),
      });
      if (res.status === 503) {
        setPhase("selfgrade"); // no API key — show the beats, self-grade
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Check failed (${res.status})`);
      }
      const r = (await res.json()) as { clean: boolean; missed: string[]; note: string };
      const overTime = active && sec > active.limitSec;
      const finalClean = r.clean && !overTime;
      setResult({
        clean: finalClean,
        missed: overTime ? [...(r.missed || []), `Over time: ${fmt(sec)} vs ${fmt(active.limitSec)} limit`] : r.missed || [],
        note: r.note,
      });
      if (finalClean) recordClean(active.id);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
      setPhase("selfgrade");
    }
  }

  function recordClean(id: string) {
    const p = { ...loadProgress() };
    const e = p[id]?.date === todayStr() ? p[id] : { date: todayStr(), cleans: 0 };
    p[id] = { date: todayStr(), cleans: e.cleans + 1 };
    setProgress(p);
    saveProgress(p);
  }

  function selfGrade(clean: boolean) {
    if (clean && active) recordClean(active.id);
    setResult({ clean, missed: [], note: clean ? "Self-graded clean." : "Self-graded as missed — run it again." });
    setPhase("result");
  }

  function backToList() {
    speech.stop();
    setActive(null);
    setPhase("ready");
  }

  const cleansFor = (id: string) => (progress[id]?.date === todayStr() ? progress[id].cleans : 0);
  const retiredToday = DRILL_ITEMS.filter((d) => cleansFor(d.id) >= GOAL).length;
  const timerClass = active && elapsed > active.limitSec ? "over" : active && elapsed > active.limitSec * 0.75 ? "warn" : "";

  return (
    <div className="dr-wrap">
      {!active && (
        <section className="dr-card">
          <p className="dr-eyebrow">Reps to criterion</p>
          <h1>Drill the spine until it's automatic</h1>
          <p className="dr-sub">
            You see only the headline — deliver the content from memory{speech.supported ? ", out loud" : ""}.
            A rep is clean only if it covers every beat, accurately, inside the time limit.{" "}
            <strong>{GOAL} clean reps</strong> retires an item for the day; everything resurfaces tomorrow.
            {" "}{retiredToday}/{DRILL_ITEMS.length} retired today.
          </p>
          <div className="dr-list">
            {DRILL_ITEMS.map((d) => {
              const c = cleansFor(d.id);
              return (
                <button key={d.id} className={`dr-item ${c >= GOAL ? "retired" : ""}`} onClick={() => startRep(d)}>
                  <span className="dr-item-main">
                    <strong>{d.title}</strong>
                    <small>{d.prompt} · {fmt(d.limitSec)} limit</small>
                  </span>
                  <span className="dr-pips" aria-label={`${c} of ${GOAL} clean reps`}>
                    {Array.from({ length: GOAL }).map((_, i) => (
                      <i key={i} className={i < c ? "on" : ""} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          {!speech.supported && (
            <p className="dr-note">
              Voice capture isn't available in this browser — you'll type your reps instead.
              Chrome or Edge enables the microphone version.
            </p>
          )}
        </section>
      )}

      {active && (
        <section className="dr-card">
          <p className="dr-eyebrow">{active.title} · {fmt(active.limitSec)} limit · {cleansFor(active.id)}/{GOAL} clean today</p>
          <h1 className="dr-prompt">{active.prompt}</h1>

          {phase === "countdown" && (
            <div className="dr-count">{countdown === 0 ? "GO" : countdown}</div>
          )}

          {phase === "live" && (
            <>
              <div className={`dr-timer ${timerClass}`}>⏱ {fmt(elapsed)} / {fmt(active.limitSec)}</div>
              {speech.supported && speech.listening ? (
                <p className="dr-live">● recording — deliver it like they're across the table</p>
              ) : (
                <textarea
                  className="dr-text"
                  rows={6}
                  placeholder="Type the rep (or use Chrome/Edge for voice)…"
                  value={rep}
                  onChange={(e) => setRep(e.target.value)}
                  autoFocus
                />
              )}
              {speech.listening && rep && <p className="dr-transcript">{rep}</p>}
              <div className="dr-actions">
                <button className="dr-btn primary" onClick={finishRep} disabled={!rep.trim() && speech.listening}>
                  ■ Done — check the rep
                </button>
                <button className="dr-btn" onClick={backToList}>Abort</button>
              </div>
            </>
          )}

          {phase === "checking" && <p className="dr-sub">Checking the rep against the beats…</p>}

          {phase === "selfgrade" && (
            <>
              {error && <p className="dr-err">{error} — self-grade this one:</p>}
              <div className="dr-target">
                <strong>The beats this rep had to cover:</strong>
                <p>{active.target}</p>
              </div>
              <p className="dr-sub">Your rep took {fmt(repSec)} (limit {fmt(active.limitSec)}){fillers > 0 ? ` · ${fillers} filler words` : ""}. Honest call:</p>
              <div className="dr-actions">
                <button className="dr-btn hit" onClick={() => selfGrade(true)}>✓ Covered everything, in time</button>
                <button className="dr-btn miss" onClick={() => selfGrade(false)}>✗ Missed something</button>
              </div>
            </>
          )}

          {phase === "result" && result && (
            <>
              <div className={`dr-verdict ${result.clean ? "clean" : "dirty"}`}>
                {result.clean ? `✓ Clean rep — ${cleansFor(active.id)}/${GOAL}` : "✗ Not clean yet"}
                <small>{fmt(repSec)} of {fmt(active.limitSec)}{fillers > 0 ? ` · ${fillers} filler word${fillers === 1 ? "" : "s"}` : " · no fillers"}</small>
              </div>
              {result.note && <p className="dr-notetext">{result.note}</p>}
              {result.missed.length > 0 && (
                <ul className="dr-missed">{result.missed.map((m, i) => <li key={i}>{m}</li>)}</ul>
              )}
              <div className="dr-actions">
                <button className="dr-btn primary" onClick={() => startRep(active)}>
                  {result.clean && cleansFor(active.id) >= GOAL ? "Once more for luck" : "Again"}
                </button>
                <button className="dr-btn" onClick={backToList}>Back to drills</button>
              </div>
            </>
          )}
        </section>
      )}

      <style>{`
        .dr-wrap { max-width: 860px; margin: 0 auto; padding: 24px 20px 80px; }
        .dr-card {
          background: var(--paper); border: 1px solid var(--line); border-radius: 24px;
          padding: clamp(22px, 4vw, 40px); box-shadow: 0 12px 40px rgba(47,42,36,0.08);
        }
        .dr-eyebrow {
          text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.72rem;
          font-weight: 800; color: var(--accent); margin: 0 0 8px;
        }
        .dr-card h1 { margin: 0 0 10px; font-size: clamp(1.4rem, 3.4vw, 1.9rem); letter-spacing: -0.02em; }
        .dr-sub { font-size: 0.95rem; }
        .dr-list { display: grid; gap: 10px; margin-top: 18px; }
        .dr-item {
          display: flex; justify-content: space-between; align-items: center; gap: 14px;
          text-align: left; font: inherit; cursor: pointer; padding: 14px 16px;
          border: 1px solid var(--line); border-radius: 14px; background: var(--paper);
          transition: border-color .15s;
        }
        .dr-item:hover { border-color: var(--accent); }
        .dr-item.retired { background: #eef5ea; }
        .dr-item-main strong { display: block; }
        .dr-item-main small { color: var(--muted); }
        .dr-pips { display: flex; gap: 5px; flex: none; }
        .dr-pips i { width: 12px; height: 12px; border-radius: 50%; background: var(--soft); border: 1px solid var(--line); }
        .dr-pips i.on { background: #2f6b38; border-color: #2f6b38; }
        .dr-note { font-size: 0.85rem; margin-top: 14px; }
        .dr-prompt { font-weight: 700; }
        .dr-count {
          font-size: 4rem; font-weight: 900; text-align: center; padding: 40px 0; color: var(--accent);
        }
        .dr-timer { font-variant-numeric: tabular-nums; font-weight: 800; font-size: 1.2rem; margin: 8px 0; }
        .dr-timer.warn { color: #a86a00; }
        .dr-timer.over { color: #b3261e; }
        .dr-live { color: #b3261e; font-weight: 700; }
        .dr-transcript {
          background: var(--soft); border-radius: 12px; padding: 12px 14px;
          color: var(--ink); font-size: 0.92rem; max-height: 160px; overflow-y: auto;
        }
        .dr-text {
          width: 100%; font: inherit; padding: 14px; border-radius: 14px;
          border: 1px solid var(--line); resize: vertical; line-height: 1.5;
        }
        .dr-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
        .dr-btn {
          font: inherit; font-weight: 800; border-radius: 999px; padding: 12px 22px;
          border: 1px solid var(--line); background: var(--paper); cursor: pointer;
        }
        .dr-btn.primary { background: var(--ink); color: #fff; border-color: transparent; }
        .dr-btn.hit { background: #2f6b38; color: #fff; border-color: transparent; }
        .dr-btn.miss { background: #fbeeec; color: #b3261e; border-color: #ecc8c3; }
        .dr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dr-target {
          background: #eef3f7; border: 1px solid #ccdce8; border-radius: 12px;
          padding: 12px 14px; font-size: 0.92rem; line-height: 1.55; color: #25404f; margin: 10px 0;
        }
        .dr-target p { margin: 6px 0 0; color: #25404f; }
        .dr-verdict {
          display: flex; align-items: baseline; gap: 14px; font-weight: 800; font-size: 1.15rem;
          padding: 14px 16px; border-radius: 14px; margin-bottom: 10px;
        }
        .dr-verdict small { font-weight: 600; color: var(--muted); }
        .dr-verdict.clean { background: #eef5ea; color: #2f6b38; }
        .dr-verdict.dirty { background: #fbeeec; color: #b3261e; }
        .dr-notetext { color: var(--ink); font-weight: 600; }
        .dr-missed { color: #8a4a12; font-size: 0.92rem; line-height: 1.5; }
        .dr-err { color: #b3261e; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}
