"use client";

// "Know These Cold" — spaced-repetition flashcards over the dossier facts.
// Progress lives in localStorage; missed cards recycle within the session,
// hits climb the interval ladder (1, 2, 4, 7, 14 days).

import { useEffect, useMemo, useState } from "react";
import { CARDS, gradeCard, isDue, todayStr, type Card, type CardState } from "@/lib/cards";

const STORE_KEY = "pp-cards";

function loadStates(): Record<string, CardState> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStates(s: Record<string, CardState>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards() {
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [queue, setQueue] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState({ hit: 0, miss: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = loadStates();
    setStates(s);
    setQueue(shuffle(CARDS.filter((c) => isDue(s[c.id]))));
    setLoaded(true);
  }, []);

  const mastered = useMemo(
    () => CARDS.filter((c) => (states[c.id]?.step ?? 0) >= 3).length,
    [states],
  );

  const current = queue[0];

  function grade(got: boolean) {
    if (!current) return;
    const next = { ...states, [current.id]: gradeCard(states[current.id], got) };
    setStates(next);
    saveStates(next);
    setDone((d) => ({ hit: d.hit + (got ? 1 : 0), miss: d.miss + (got ? 0 : 1) }));
    setRevealed(false);
    // Misses come back later in this same session; hits leave the queue.
    setQueue((q) => (got ? q.slice(1) : [...q.slice(1), current]));
  }

  function restartAll() {
    setQueue(shuffle(CARDS));
    setDone({ hit: 0, miss: 0 });
    setRevealed(false);
  }

  if (!loaded) return null;

  return (
    <div className="fc-wrap">
      <section className="fc-card-outer">
        <div className="fc-stats">
          <span><strong>{queue.length}</strong> in today's queue</span>
          <span><strong>{mastered}</strong>/{CARDS.length} mastered (3+ clean intervals)</span>
          <span>{done.hit} hit · {done.miss} missed this session</span>
        </div>

        {current ? (
          <>
            <p className="fc-cat">{current.cat}</p>
            <div className="fc-face">
              <p className="fc-front">{current.front}</p>
              {revealed && <p className="fc-back">{current.back}</p>}
            </div>
            {!revealed ? (
              <div className="fc-actions">
                <button className="fc-btn primary" onClick={() => setRevealed(true)}>
                  Reveal — but say it out loud first
                </button>
              </div>
            ) : (
              <div className="fc-actions">
                <button className="fc-btn miss" onClick={() => grade(false)}>✗ Missed it</button>
                <button className="fc-btn hit" onClick={() => grade(true)}>✓ Had it cold</button>
              </div>
            )}
          </>
        ) : (
          <div className="fc-done">
            <h2>Deck clear for today 🎯</h2>
            <p>
              Cards you hit climb the ladder (1 → 2 → 4 → 7 → 14 days); misses come back
              tomorrow. Come back daily — the spacing is the point.
            </p>
            <button className="fc-btn" onClick={restartAll}>Run the full deck anyway</button>
          </div>
        )}
      </section>

      <style>{`
        .fc-wrap { max-width: 720px; margin: 0 auto; padding: 24px 20px 80px; }
        .fc-card-outer {
          background: var(--paper); border: 1px solid var(--line); border-radius: 24px;
          padding: clamp(22px, 4vw, 40px); box-shadow: 0 12px 40px rgba(47,42,36,0.08);
        }
        .fc-stats {
          display: flex; gap: 18px; flex-wrap: wrap; font-size: 0.84rem;
          color: var(--muted); margin-bottom: 18px; padding-bottom: 14px;
          border-bottom: 1px dashed var(--line);
        }
        .fc-cat {
          text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.72rem;
          font-weight: 800; color: var(--accent); margin: 0 0 8px;
        }
        .fc-face { min-height: 160px; }
        .fc-front { font-size: clamp(1.1rem, 2.6vw, 1.35rem); font-weight: 700; color: var(--ink); line-height: 1.4; }
        .fc-back {
          background: var(--soft); border-radius: 14px; padding: 14px 16px;
          color: var(--ink); line-height: 1.55; font-size: 0.98rem;
        }
        .fc-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .fc-btn {
          font: inherit; font-weight: 800; border-radius: 999px; padding: 12px 22px;
          border: 1px solid var(--line); background: var(--paper); cursor: pointer;
        }
        .fc-btn.primary { background: var(--ink); color: #fff; border-color: transparent; }
        .fc-btn.hit { background: #2f6b38; color: #fff; border-color: transparent; }
        .fc-btn.miss { background: #fbeeec; color: #b3261e; border-color: #ecc8c3; }
        .fc-done h2 { margin: 0 0 8px; }
      `}</style>
    </div>
  );
}
