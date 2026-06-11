"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AirtableOrder } from "@/lib/airtable";

type Draft = {
  title: string;
  levelId: string;
  childName: string;
  characterDescription: string;
  coverArtPrompt: string;
  pages: { n: number; text: string; artPrompt: string }[];
};
type Check = { pass: boolean; problems: string[]; stats: { totalWords: number; pages: number } };
type Grade = { pass: boolean; score: number; issues: string[]; praise: string };

const field = (o: AirtableOrder, k: string) => (o.fields?.[k] ?? "") as string;

async function step(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Step failed");
  return data;
}

export default function CreateClient({ initialOrders, loadError }: { initialOrders: AirtableOrder[]; loadError: string | null }) {
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get("recordId") || "");
  const [pageCount, setPageCount] = useState(10);
  const [levelId, setLevelId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [order, setOrder] = useState<unknown>(null);
  const [saved, setSaved] = useState("");
  const [note, setNote] = useState("");

  const candidates = useMemo(
    () => initialOrders.filter((o) => ["Paid", "Designing"].includes(field(o, "Status"))),
    [initialOrders],
  );
  const selected = candidates.find((o) => o.id === selectedId) || initialOrders.find((o) => o.id === selectedId);

  async function generate() {
    if (!selectedId) return;
    setError(""); setSaved(""); setGrade(null);
    try {
      setBusy("Writing the story…");
      const g = await step({ action: "generate", recordId: selectedId, pageCount, levelId: levelId || undefined });
      let d: Draft = g.draft; let c: Check = g.check;
      setDraft(d); setCheck(c); setOrder(g.order);

      // Auto-fix deterministic rule breaks first.
      if (!c.pass) {
        setBusy("Rules check failed — revising…");
        const r = await step({ action: "revise", draft: d, issues: c.problems });
        d = r.draft; c = r.check; setDraft(d); setCheck(c);
      }
      setBusy("AI quality grading…");
      const q = await step({ action: "grade", draft: d, order: g.order });
      let gr: Grade = q.grade; setGrade(gr);
      if (!gr.pass && gr.issues?.length) {
        setBusy("Grader flagged issues — revising…");
        const r2 = await step({ action: "revise", draft: d, issues: gr.issues });
        d = r2.draft; setDraft(d); setCheck(r2.check);
        setBusy("Re-grading…");
        const q2 = await step({ action: "grade", draft: d, order: g.order });
        setGrade(q2.grade);
      }
      setBusy("");
    } catch (e: any) {
      setError(e?.message || String(e)); setBusy("");
    }
  }

  async function reviseWithNote() {
    if (!draft || !note.trim()) return;
    setError("");
    try {
      setBusy("Revising with your note…");
      const r = await step({ action: "revise", draft, issues: [note.trim()] });
      setDraft(r.draft); setCheck(r.check); setNote("");
      setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  async function save(approved: boolean) {
    if (!draft || !selectedId) return;
    setError("");
    try {
      setBusy("Saving to the order…");
      await step({ action: "save", recordId: selectedId, draft, approved });
      setSaved(approved ? "Story approved & saved — ready for art (Phase 2)." : "Draft saved to the order.");
      setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  function setPageText(n: number, text: string) {
    if (!draft) return;
    setDraft({ ...draft, pages: draft.pages.map((p) => (p.n === n ? { ...p, text } : p)) });
  }

  return (
    <div className="crt-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="crt-top">
        <div>
          <h1>Create a book</h1>
          <p className="sub">Pick a paid order — the engine writes a leveled story, QA-checks it twice, and you sign off.</p>
        </div>
        <a className="crt-btn" href="/admin">&larr; Back to orders</a>
      </div>

      {loadError && <p className="crt-error">{loadError}</p>}

      <div className="crt-card">
        <h2>1 · Order</h2>
        <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setDraft(null); setGrade(null); setCheck(null); setSaved(""); }}>
          <option value="">Choose an order…</option>
          {candidates.map((o) => (
            <option key={o.id} value={o.id}>
              {field(o, "Child name") || "?"} — {field(o, "Product")} — {field(o, "Status")}
            </option>
          ))}
        </select>
        {selected && (
          <p className="hint">
            {field(selected, "Child name")}, age {field(selected, "Age") || "?"} · {field(selected, "Reading level") || "level not set"} · loves: {[field(selected, "Theme 1"), field(selected, "Theme 2"), field(selected, "Theme 3")].filter(Boolean).join(", ") || "—"}
          </p>
        )}
        <div className="crt-row">
          <label>Story pages
            <input type="number" min={4} max={20} value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 10)} />
          </label>
          <label>Level override (optional)
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Use order / age</option>
              <option value="L1">Level 1 — brand-new reader</option>
              <option value="L2">Level 2 — very early reader</option>
              <option value="L3">Level 3 — growing reader</option>
              <option value="L4">Level 4 — more confident reader</option>
            </select>
          </label>
        </div>
        <button className="crt-btn crt-primary" disabled={!selectedId || !!busy} onClick={generate}>
          {busy || (draft ? "Regenerate from scratch" : "Generate story draft")}
        </button>
      </div>

      {draft && (
        <div className="crt-card">
          <h2>2 · Draft — “{draft.title}”</h2>
          <div className="crt-badges">
            {check && <span className={"badge " + (check.pass ? "ok" : "bad")}>{check.pass ? "✓ Level rules pass" : `✗ ${check.problems.length} rule issue(s)`}</span>}
            {grade && <span className={"badge " + (grade.pass ? "ok" : "bad")}>{grade.pass ? `✓ QA grade ${grade.score}/10` : `✗ QA grade ${grade.score}/10`}</span>}
            <span className="badge">{check?.stats.totalWords ?? "?"} words · {draft.pages.length} pages</span>
          </div>
          {check && !check.pass && <ul className="crt-issues">{check.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {grade && !grade.pass && <ul className="crt-issues">{grade.issues.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {grade?.praise && <p className="hint">“{grade.praise}”</p>}

          <p className="hint" style={{ marginTop: 10 }}><strong>Character:</strong> {draft.characterDescription}</p>

          <div className="crt-pages">
            {draft.pages.map((p) => (
              <div className="crt-page" key={p.n}>
                <div className="pn">Page {p.n}</div>
                <textarea value={p.text} onChange={(e) => setPageText(p.n, e.target.value)} rows={2} />
                <details><summary>Art direction</summary><p>{p.artPrompt}</p></details>
              </div>
            ))}
          </div>

          <div className="crt-revise">
            <input placeholder="Ask for a change… e.g. 'make page 3 about her dog Biscuit'" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="crt-btn" disabled={!note.trim() || !!busy} onClick={reviseWithNote}>Revise</button>
          </div>

          <div className="crt-actions">
            <button className="crt-btn" disabled={!!busy} onClick={() => save(false)}>Save draft</button>
            <button className="crt-btn crt-primary" disabled={!!busy} onClick={() => save(true)}>Approve story ✓</button>
          </div>
          {saved && <p className="crt-saved">{saved}</p>}
        </div>
      )}

      {error && <p className="crt-error">{error}</p>}
    </div>
  );
}

const CSS = `
  .crt-wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 64px; color: #2f2a24; font-family: Inter, system-ui, sans-serif; }
  .crt-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .crt-top h1 { margin: 0; font-size: 1.7rem; }
  .crt-top .sub { color: #7a7164; margin: 4px 0 0; font-size: .92rem; }
  .crt-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 16px; padding: 22px; margin-bottom: 16px; }
  .crt-card h2 { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #7a7164; margin: 0 0 14px; }
  .crt-card select, .crt-card input, .crt-card textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: .95rem; border: 1.5px solid #e0d8c8; border-radius: 10px; background: #fffdf8; font-family: inherit; }
  .crt-row { display: flex; gap: 14px; margin: 12px 0; } .crt-row label { flex: 1; font-size: .82rem; font-weight: 700; }
  .crt-row input, .crt-row select { margin-top: 5px; }
  .crt-btn { border: 1px solid #e7e0d4; background: #fff; color: #2f2a24; border-radius: 999px; padding: 10px 18px; font-weight: 700; font-size: .92rem; cursor: pointer; text-decoration: none; display: inline-block; font-family: inherit; }
  .crt-primary { background: #f5b78d; border-color: #f5b78d; color: #4a3520; }
  .crt-btn:disabled { opacity: .55; cursor: not-allowed; }
  .crt-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .badge { font-size: .78rem; font-weight: 700; padding: 5px 11px; border-radius: 999px; background: #f6f0e4; }
  .badge.ok { background: #e3efdd; color: #2f5e38; } .badge.bad { background: #f7e0dd; color: #8c2f25; }
  .crt-issues { margin: 8px 0; padding-left: 20px; font-size: .85rem; color: #8c2f25; }
  .crt-pages { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }
  .crt-page { border: 1px solid #efe8da; border-radius: 12px; padding: 10px 12px; background: #fffdf8; }
  .crt-page .pn { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #b96e3c; margin-bottom: 6px; }
  .crt-page textarea { border: none; background: transparent; padding: 0; font-size: 1rem; resize: vertical; }
  .crt-page details { font-size: .82rem; color: #7a7164; margin-top: 6px; } .crt-page summary { cursor: pointer; font-weight: 600; }
  .crt-revise { display: flex; gap: 10px; margin: 12px 0; } .crt-revise input { flex: 1; }
  .crt-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .crt-saved { color: #2f5e38; font-weight: 700; }
  .crt-error { color: #b3261e; font-weight: 600; }
  .hint { font-size: .84rem; color: #7a7164; }
  @media (max-width: 640px) { .crt-row { flex-direction: column; } }
`;
