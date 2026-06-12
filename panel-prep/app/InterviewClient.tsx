"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PANELISTS, THE_ROOM, THREE_MESSAGES,
  type Panelist, type InterviewQuestion,
} from "@/lib/interview";

type Mode = "panel" | "single" | "tough";

type Item = { panelist: Panelist; question: InterviewQuestion };

type Feedback = {
  score: number;
  headline: string;
  strengths: string[];
  fixes: string[];
  followUp: string | null;
};

type Debrief = {
  readiness: string;
  summary: string;
  messages: Array<{ message: string; landed: boolean; note: string }>;
  topFixes: string[];
};

type Entry = {
  panelist: string;
  question: string;
  answer: string;
  score?: number;
  spokenSec: number;
  skipped?: boolean;
};

const WPM = 145; // average spoken pace used to estimate answer length

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(mode: Mode, singleId: string): Item[] {
  if (mode === "single") {
    const p = PANELISTS.find((x) => x.id === singleId) || PANELISTS[0];
    return p.questions.map((question) => ({ panelist: p, question }));
  }
  if (mode === "tough") {
    const items: Item[] = [];
    for (const p of PANELISTS) {
      for (const q of p.questions) if (q.toughSpot) items.push({ panelist: p, question: q });
    }
    return [...shuffle(items), { panelist: THE_ROOM, question: THE_ROOM.questions[0] }];
  }
  // Full panel: two questions per panelist, shuffled order, closer at the end.
  const items: Item[] = [];
  for (const p of PANELISTS) {
    for (const q of shuffle(p.questions).slice(0, 2)) items.push({ panelist: p, question: q });
  }
  return [...shuffle(items), { panelist: THE_ROOM, question: THE_ROOM.questions[0] }];
}

function spokenSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / WPM) * 60);
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function InterviewClient() {
  const [phase, setPhase] = useState<"setup" | "live" | "debrief">("setup");
  const [mode, setMode] = useState<Mode>("panel");
  const [singleId, setSingleId] = useState(PANELISTS[0].id);
  const [queue, setQueue] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // Per-question state
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"answering" | "scoring" | "scored">("answering");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [apiError, setApiError] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Follow-up exchange state
  const [fuAnswer, setFuAnswer] = useState("");
  const [fuStatus, setFuStatus] = useState<"idle" | "scoring" | "scored">("idle");
  const [fuFeedback, setFuFeedback] = useState<Feedback | null>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefStatus, setDebriefStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const startRef = useRef(Date.now());
  const current = queue[idx];

  useEffect(() => {
    if (phase !== "live" || status !== "answering") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, status, idx]);

  const spoken = useMemo(() => spokenSeconds(answer), [answer]);

  function start(m: Mode) {
    setMode(m);
    setQueue(buildQueue(m, singleId));
    setIdx(0);
    setEntries([]);
    setDebrief(null);
    setDebriefStatus("idle");
    resetQuestionState();
    setPhase("live");
  }

  function resetQuestionState() {
    setAnswer("");
    setStatus("answering");
    setFeedback(null);
    setApiError("");
    setShowHint(false);
    setShowModel(false);
    setElapsed(0);
    setFuAnswer("");
    setFuStatus("idle");
    setFuFeedback(null);
    startRef.current = Date.now();
  }

  async function callRespond(body: Record<string, unknown>): Promise<Feedback | null> {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", ...body }),
    });
    if (res.status === 503) {
      setAiAvailable(false);
      return null;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Request failed (${res.status})`);
    }
    setAiAvailable(true);
    return (await res.json()) as Feedback;
  }

  async function submitAnswer() {
    if (!answer.trim() || !current) return;
    setStatus("scoring");
    setApiError("");
    try {
      const fb = aiAvailable === false ? null : await callRespond({
        panelistId: current.panelist.id,
        question: current.question.text,
        answer,
        spokenSeconds: spoken,
      });
      setFeedback(fb);
      setEntries((prev) => [...prev, {
        panelist: current.panelist.name,
        question: current.question.text,
        answer,
        score: fb?.score,
        spokenSec: spoken,
      }]);
      setStatus("scored");
      if (!fb) setShowHint(true); // no AI — dossier hint becomes the feedback
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Coaching call failed");
      setStatus("answering");
    }
  }

  async function submitFollowUp() {
    if (!fuAnswer.trim() || !current || !feedback?.followUp) return;
    setFuStatus("scoring");
    setApiError("");
    try {
      const fb = await callRespond({
        panelistId: current.panelist.id,
        question: feedback.followUp,
        answer: fuAnswer,
        spokenSeconds: spokenSeconds(fuAnswer),
        isFollowUp: true,
        priorQuestion: current.question.text,
        priorAnswer: answer,
      });
      setFuFeedback(fb);
      setEntries((prev) => [...prev, {
        panelist: `${current.panelist.name} (follow-up)`,
        question: feedback.followUp as string,
        answer: fuAnswer,
        score: fb?.score,
        spokenSec: spokenSeconds(fuAnswer),
      }]);
      setFuStatus("scored");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Coaching call failed");
      setFuStatus("idle");
    }
  }

  function skip() {
    next();
  }

  function next() {
    if (idx + 1 >= queue.length) {
      setPhase("debrief");
      runDebrief();
      return;
    }
    setIdx(idx + 1);
    resetQuestionState();
  }

  async function runDebrief() {
    const answered = entries.filter((e) => !e.skipped && e.answer.trim());
    if (!answered.length || aiAvailable === false) return;
    setDebriefStatus("loading");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "debrief", entries: answered }),
      });
      if (!res.ok) throw new Error();
      setDebrief((await res.json()) as Debrief);
      setDebriefStatus("done");
    } catch {
      setDebriefStatus("error");
    }
  }

  const avgScore = useMemo(() => {
    const scored = entries.filter((e) => typeof e.score === "number");
    if (!scored.length) return null;
    return (scored.reduce((s, e) => s + (e.score || 0), 0) / scored.length).toFixed(1);
  }, [entries]);

  const timerClass = elapsed > 120 ? "over" : elapsed > 90 ? "warn" : "";
  const spokenClass = spoken > 120 ? "over" : spoken > 90 ? "warn" : "";

  return (
    <div className="iv-wrap">
      {phase === "setup" && (
        <section className="iv-card iv-setup">
          <p className="iv-eyebrow">WSP USA · Senior Director, Government Relations · Second Round</p>
          <h1>Panel Interview Simulator</h1>
          <p className="iv-sub">
            Six panelists, two constituencies: the GA team testing whether you run their playbook,
            and three regional P&L owners asking one thing — <em>will this person help us win work?</em>{" "}
            Lead with the headline, give one proof point, stop.
          </p>

          <div className="iv-panel-grid">
            {PANELISTS.map((p) => (
              <div key={p.id} className="iv-panelist-chip">
                <span className="iv-avatar" style={{ background: p.color }}>{p.initials}</span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.title}</small>
                  <small className="iv-style">{p.style}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="iv-modes">
            <button className="iv-mode" onClick={() => start("panel")}>
              <strong>Full panel mock</strong>
              <span>Two questions from each of the six, shuffled, ending with “questions for us?” — the real-day rep.</span>
            </button>
            <button className="iv-mode" onClick={() => start("tough")}>
              <strong>Tough spots gauntlet</strong>
              <span>Why leave Meta, the consultancy gap, travel, and the 90-day plan — the answers you can’t wing.</span>
            </button>
            <div className="iv-mode iv-mode-single">
              <strong>Single panelist drill</strong>
              <select value={singleId} onChange={(e) => setSingleId(e.target.value)}>
                {PANELISTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.title}</option>
                ))}
              </select>
              <button className="iv-btn primary" onClick={() => start("single")}>Drill this panelist</button>
            </div>
          </div>

          <details className="iv-cheat">
            <summary>The three messages to land no matter what</summary>
            <ol>{THREE_MESSAGES.map((m) => <li key={m}>{m}</li>)}</ol>
          </details>
        </section>
      )}

      {phase === "live" && current && (
        <section className="iv-card">
          <div className="iv-topbar">
            <span className="iv-progress">Question {idx + 1} of {queue.length}</span>
            <span className={`iv-timer ${timerClass}`}>⏱ {fmt(elapsed)}</span>
          </div>
          <div className="iv-progressbar"><span style={{ width: `${((idx) / queue.length) * 100}%` }} /></div>

          <div className="iv-asker">
            <span className="iv-avatar lg" style={{ background: current.panelist.color }}>{current.panelist.initials}</span>
            <div>
              <strong>{current.panelist.name}</strong>
              <small>{current.panelist.title}</small>
              <small className="iv-style">{current.panelist.role}</small>
            </div>
          </div>

          <blockquote className="iv-question">“{current.question.text}”</blockquote>

          {status !== "scored" && (
            <>
              <textarea
                className="iv-answer"
                placeholder="Speak your answer out loud first, then type the spine of it here — headline, one proof point, close."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={7}
                disabled={status === "scoring"}
                autoFocus
              />
              <div className="iv-meta">
                <span className={spokenClass}>
                  ~{fmt(spoken)} spoken at {WPM} wpm {spoken > 120 ? "— too long for this panel, cut it" : spoken > 90 ? "— getting long" : ""}
                </span>
                <span className="iv-hintbtns">
                  <button className="iv-link" onClick={() => setShowHint((v) => !v)}>
                    {showHint ? "Hide hint" : "What are they listening for?"}
                  </button>
                  <button className="iv-link" onClick={() => setShowModel((v) => !v)}>
                    {showModel ? "Hide strong answer" : "Show a strong answer"}
                  </button>
                </span>
              </div>
              {showHint && <div className="iv-hint">{current.question.hint}</div>}
              {showModel && (
                <div className="iv-model">
                  <strong>A strong answer</strong>{" "}
                  <em>(bracketed [slots] = swap in your own specifics, then say it in your own words)</em>
                  <p>{current.question.modelAnswer}</p>
                </div>
              )}
              {apiError && (
                <p className="iv-error">
                  {apiError} — <button className="iv-link" onClick={submitAnswer}>retry</button> or{" "}
                  <button className="iv-link" onClick={() => { setAiAvailable(false); submitAnswer(); }}>continue without AI coaching</button>
                </p>
              )}
              <div className="iv-actions">
                <button className="iv-btn primary" onClick={submitAnswer} disabled={!answer.trim() || status === "scoring"}>
                  {status === "scoring" ? "The panel is reacting…" : "Deliver answer"}
                </button>
                <button className="iv-btn" onClick={skip} disabled={status === "scoring"}>Skip</button>
              </div>
            </>
          )}

          {status === "scored" && (
            <>
              <div className="iv-given">
                <small>Your answer (~{fmt(spoken)} spoken)</small>
                <p>{answer}</p>
              </div>

              {feedback ? (
                <div className="iv-feedback">
                  <div className="iv-score-row">
                    <span className="iv-score">{feedback.score}/5</span>
                    <strong>{feedback.headline}</strong>
                  </div>
                  {feedback.strengths?.length > 0 && (
                    <ul className="iv-good">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  )}
                  {feedback.fixes?.length > 0 && (
                    <ul className="iv-fix">{feedback.fixes.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  )}
                </div>
              ) : (
                <div className="iv-hint">
                  <strong>What {current.panelist.name} was listening for:</strong> {current.question.hint}
                </div>
              )}

              <button className="iv-link" onClick={() => setShowModel((v) => !v)}>
                {showModel ? "Hide strong answer" : "Compare with a strong answer"}
              </button>
              {showModel && (
                <div className="iv-model">
                  <strong>A strong answer</strong>{" "}
                  <em>(bracketed [slots] = swap in your own specifics)</em>
                  <p>{current.question.modelAnswer}</p>
                </div>
              )}

              {feedback?.followUp && fuStatus !== "scored" && (
                <div className="iv-followup">
                  <div className="iv-asker sm">
                    <span className="iv-avatar" style={{ background: current.panelist.color }}>{current.panelist.initials}</span>
                    <em>“{feedback.followUp}”</em>
                  </div>
                  <textarea
                    className="iv-answer"
                    placeholder="Handle the follow-up — or hit Next question to move on."
                    value={fuAnswer}
                    onChange={(e) => setFuAnswer(e.target.value)}
                    rows={4}
                    disabled={fuStatus === "scoring"}
                  />
                  {apiError && <p className="iv-error">{apiError}</p>}
                  <button className="iv-btn" onClick={submitFollowUp} disabled={!fuAnswer.trim() || fuStatus === "scoring"}>
                    {fuStatus === "scoring" ? "The panel is reacting…" : "Answer follow-up"}
                  </button>
                </div>
              )}

              {fuStatus === "scored" && fuFeedback && (
                <div className="iv-feedback">
                  <div className="iv-score-row">
                    <span className="iv-score">{fuFeedback.score}/5</span>
                    <strong>{fuFeedback.headline}</strong>
                  </div>
                  {fuFeedback.fixes?.length > 0 && (
                    <ul className="iv-fix">{fuFeedback.fixes.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  )}
                </div>
              )}

              <div className="iv-actions">
                <button className="iv-btn primary" onClick={next}>
                  {idx + 1 >= queue.length ? "Finish — get the debrief" : "Next question"}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {phase === "debrief" && (
        <section className="iv-card">
          <p className="iv-eyebrow">Session debrief</p>
          <h1>{debrief?.readiness || "How it went"}</h1>
          {avgScore && <p className="iv-sub">Average answer score: <strong>{avgScore}/5</strong> across {entries.filter((e) => typeof e.score === "number").length} scored answers.</p>}

          {debriefStatus === "loading" && <p className="iv-sub">The coach is writing your debrief…</p>}
          {debriefStatus === "error" && <p className="iv-error">Debrief generation failed — your per-question feedback above still stands.</p>}

          {debrief && (
            <>
              <p className="iv-summary">{debrief.summary}</p>
              <h2>The three messages</h2>
              <ul className="iv-messages">
                {debrief.messages.map((m, i) => (
                  <li key={i} className={m.landed ? "landed" : "missed"}>
                    <span>{m.landed ? "✓" : "✗"}</span>
                    <div><strong>{m.message}</strong><p>{m.note}</p></div>
                  </li>
                ))}
              </ul>
              <h2>Before the real panel</h2>
              <ol className="iv-fixlist">{debrief.topFixes.map((f, i) => <li key={i}>{f}</li>)}</ol>
            </>
          )}

          {!debrief && debriefStatus !== "loading" && (
            <>
              <h2>The three messages to land</h2>
              <ol className="iv-fixlist">{THREE_MESSAGES.map((m) => <li key={m}>{m}</li>)}</ol>
            </>
          )}

          {entries.length > 0 && (
            <details className="iv-cheat">
              <summary>Full transcript ({entries.length} answers)</summary>
              {entries.map((e, i) => (
                <div key={i} className="iv-transcript-item">
                  <small>{e.panelist}{typeof e.score === "number" ? ` · ${e.score}/5` : ""} · ~{fmt(e.spokenSec)} spoken</small>
                  <p className="iv-tq">“{e.question}”</p>
                  <p>{e.answer}</p>
                </div>
              ))}
            </details>
          )}

          <div className="iv-actions">
            <button className="iv-btn primary" onClick={() => setPhase("setup")}>Run it again</button>
          </div>
        </section>
      )}

      <style>{`
        .iv-wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 80px; }
        .iv-card {
          background: #fff; border: 1px solid var(--line, #eadccb); border-radius: 24px;
          padding: clamp(24px, 4vw, 44px); box-shadow: 0 12px 40px rgba(47,42,36,0.08);
        }
        .iv-eyebrow {
          text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.74rem;
          font-weight: 800; color: #8c5b37; margin: 0 0 10px;
        }
        .iv-card h1 { margin: 0 0 12px; font-size: clamp(1.6rem, 4vw, 2.2rem); letter-spacing: -0.02em; }
        .iv-card h2 { margin: 26px 0 10px; font-size: 1.1rem; }
        .iv-sub { font-size: 1rem; max-width: 640px; }
        .iv-panel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin: 22px 0; }
        .iv-panelist-chip {
          display: flex; gap: 10px; align-items: flex-start; padding: 12px;
          border: 1px solid var(--line, #eadccb); border-radius: 14px; background: #fdfaf4;
        }
        .iv-panelist-chip strong { display: block; font-size: 0.92rem; }
        .iv-panelist-chip small { display: block; color: var(--muted, #665d52); font-size: 0.78rem; line-height: 1.35; }
        .iv-style { font-style: italic; }
        .iv-avatar {
          flex: none; width: 36px; height: 36px; border-radius: 50%; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.82rem; letter-spacing: 0.02em;
        }
        .iv-avatar.lg { width: 48px; height: 48px; font-size: 1rem; }
        .iv-modes { display: grid; gap: 12px; margin: 8px 0 18px; }
        .iv-mode {
          text-align: left; border: 1px solid var(--line, #eadccb); background: #fff;
          border-radius: 16px; padding: 16px 18px; cursor: pointer; font: inherit;
          display: grid; gap: 4px; transition: border-color .15s, transform .15s;
        }
        button.iv-mode:hover { border-color: #8c5b37; transform: translateY(-1px); }
        .iv-mode strong { font-size: 1.02rem; }
        .iv-mode span { color: var(--muted, #665d52); font-size: 0.9rem; }
        .iv-mode-single { cursor: default; }
        .iv-mode-single select {
          font: inherit; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line, #eadccb);
          margin: 6px 0; max-width: 100%;
        }
        .iv-btn {
          font: inherit; font-weight: 800; border-radius: 999px; padding: 12px 22px;
          border: 1px solid var(--line, #eadccb); background: #fff; cursor: pointer;
        }
        .iv-btn.primary { background: var(--ink, #2f2a24); color: #fff; border-color: transparent; }
        .iv-btn.primary:hover { background: #1d1915; }
        .iv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .iv-cheat { margin-top: 16px; border-top: 1px dashed var(--line, #eadccb); padding-top: 14px; }
        .iv-cheat summary { cursor: pointer; font-weight: 700; font-size: 0.92rem; }
        .iv-cheat ol { color: var(--muted, #665d52); }
        .iv-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .iv-progress { font-weight: 800; font-size: 0.85rem; color: var(--muted, #665d52); }
        .iv-timer { font-variant-numeric: tabular-nums; font-weight: 800; font-size: 0.95rem; }
        .iv-timer.warn, .warn { color: #a86a00; }
        .iv-timer.over, .over { color: #b3261e; }
        .iv-progressbar { height: 5px; background: var(--soft, #f3eadb); border-radius: 99px; overflow: hidden; margin-bottom: 24px; }
        .iv-progressbar span { display: block; height: 100%; background: #8c5b37; transition: width .3s; }
        .iv-asker { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
        .iv-asker strong { display: block; }
        .iv-asker small { display: block; color: var(--muted, #665d52); font-size: 0.8rem; }
        .iv-asker.sm { margin: 14px 0 8px; align-items: flex-start; }
        .iv-asker.sm em { padding-top: 6px; }
        .iv-question {
          margin: 0 0 18px; padding: 16px 20px; border-left: 4px solid #8c5b37;
          background: #fdfaf4; border-radius: 0 14px 14px 0;
          font-size: clamp(1.05rem, 2.4vw, 1.25rem); font-weight: 600; line-height: 1.4;
        }
        .iv-answer {
          width: 100%; font: inherit; padding: 14px; border-radius: 14px;
          border: 1px solid var(--line, #eadccb); resize: vertical; line-height: 1.5;
        }
        .iv-answer:focus { outline: 2px solid var(--peach, #f5b78d); border-color: transparent; }
        .iv-meta {
          display: flex; justify-content: space-between; align-items: center; gap: 10px;
          margin: 8px 0 4px; font-size: 0.85rem; color: var(--muted, #665d52); flex-wrap: wrap;
        }
        .iv-link {
          font: inherit; font-size: 0.85rem; background: none; border: none; cursor: pointer;
          color: #8c5b37; font-weight: 700; text-decoration: underline; padding: 0;
        }
        .iv-hint {
          background: #fff7e6; border: 1px solid #f0dcae; border-radius: 12px;
          padding: 12px 14px; font-size: 0.9rem; line-height: 1.5; margin: 8px 0; color: #5a4a22;
        }
        .iv-hintbtns { display: flex; gap: 14px; flex-wrap: wrap; }
        .iv-model {
          background: #eef3f7; border: 1px solid #ccdce8; border-radius: 12px;
          padding: 12px 14px; font-size: 0.92rem; line-height: 1.55; margin: 8px 0; color: #25404f;
        }
        .iv-model em { font-size: 0.8rem; color: #54707f; font-style: italic; }
        .iv-model p { margin: 8px 0 0; color: #25404f; white-space: pre-wrap; }
        .iv-error { color: #b3261e; font-size: 0.9rem; }
        .iv-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
        .iv-given { background: #fdfaf4; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .iv-given small { color: var(--muted, #665d52); font-weight: 700; }
        .iv-given p { margin: 6px 0 0; color: var(--ink, #2f2a24); white-space: pre-wrap; }
        .iv-feedback { border: 1px solid var(--line, #eadccb); border-radius: 16px; padding: 16px 18px; margin-bottom: 6px; }
        .iv-score-row { display: flex; gap: 12px; align-items: baseline; margin-bottom: 8px; }
        .iv-score {
          flex: none; background: var(--ink, #2f2a24); color: #fff; border-radius: 999px;
          padding: 4px 12px; font-weight: 800; font-size: 0.9rem;
        }
        .iv-good, .iv-fix { margin: 8px 0; padding-left: 20px; font-size: 0.92rem; line-height: 1.5; }
        .iv-good li { color: #2f6b38; margin-bottom: 4px; }
        .iv-fix li { color: #8a4a12; margin-bottom: 4px; }
        .iv-followup { border-top: 1px dashed var(--line, #eadccb); margin-top: 14px; padding-top: 4px; }
        .iv-summary { font-size: 1rem; line-height: 1.6; }
        .iv-messages { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        .iv-messages li { display: flex; gap: 12px; border-radius: 12px; padding: 12px 14px; }
        .iv-messages li.landed { background: #eef5ea; }
        .iv-messages li.missed { background: #fbeeec; }
        .iv-messages li > span { font-weight: 900; }
        .iv-messages li.landed > span { color: #2f6b38; }
        .iv-messages li.missed > span { color: #b3261e; }
        .iv-messages p { margin: 4px 0 0; font-size: 0.88rem; }
        .iv-fixlist li { margin-bottom: 8px; color: var(--ink, #2f2a24); }
        .iv-transcript-item { border-top: 1px solid var(--line, #eadccb); padding: 12px 0; }
        .iv-transcript-item small { color: var(--muted, #665d52); font-weight: 700; }
        .iv-tq { font-weight: 600; color: var(--ink, #2f2a24); margin: 6px 0 4px; }
        @media (max-width: 560px) {
          .iv-card { padding: 20px 16px; }
          .iv-panel-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
