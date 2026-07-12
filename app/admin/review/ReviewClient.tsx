"use client";

// Morning review queue: every overnight candidate as a card — page thumbnail
// strip, QA flags inline, one click into the create screen to finish (redo a
// page / assemble / deliver). Read-first triage: clean books are a skim; only
// flagged pages need real attention.

import { useMemo, useState } from "react";
import type { AirtableOrder } from "@/lib/airtable";

type PipePage = { url: string; pass: boolean; issues?: string[] };
type PipeState = {
  phase: string;
  imageCalls?: number;
  charUrl?: string;
  error?: string;
  grade?: { pass: boolean; score: number };
  pages?: Record<string, PipePage>;
  updatedAt?: string;
};

const field = (o: AirtableOrder, k: string) => (o.fields?.[k] ?? "") as string;

function pipeState(o: AirtableOrder): PipeState | null {
  try {
    const raw = field(o, "Pipeline state");
    return raw ? (JSON.parse(raw) as PipeState) : null;
  } catch { return null; }
}

function draftTitle(o: AirtableOrder): string {
  try {
    const raw = field(o, "Story draft");
    return raw ? String(JSON.parse(raw)?.title || "") : "";
  } catch { return ""; }
}

const thumb = (url: string) => `/api/admin/candidate?src=${encodeURIComponent(url)}`;

function Card({ o }: { o: AirtableOrder }) {
  const [open, setOpen] = useState<PipePage | null>(null);
  const st = pipeState(o);
  const status = field(o, "Status");
  const pages = Object.entries(st?.pages || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const flagged = pages.filter(([, p]) => !p.pass);
  const title = draftTitle(o);
  return (
    <div className="rv-card">
      <div className="rv-head">
        <div>
          <div className="rv-child">{field(o, "Child name") || "?"}</div>
          <div className="rv-sub">
            {title && <em>“{title}”</em>} · {field(o, "Product")} · {field(o, "Reading level") || "level by age"}
            {st?.grade && <> · story grade {st.grade.score}/10</>}
            {typeof st?.imageCalls === "number" && <> · {st.imageCalls} images</>}
          </div>
        </div>
        <span className={"rv-badge " + (status === "Ready for review" ? "ok" : status === "Needs attention" ? "bad" : "")}>{status}</span>
      </div>
      {st?.error && <p className="rv-error">{st.error}</p>}
      {flagged.length > 0 && (
        <ul className="rv-issues">
          {flagged.map(([n, p]) => (
            <li key={n}><strong>{n === "0" ? "Cover" : `Page ${n}`}:</strong> {(p.issues || []).join("; ") || "QA failed"}</li>
          ))}
        </ul>
      )}
      <div className="rv-strip">
        {st?.charUrl && (
          <figure className="rv-thumb" title="Character sheet">
            <img src={thumb(st.charUrl)} alt="Character sheet" loading="lazy" />
            <figcaption>Sheet</figcaption>
          </figure>
        )}
        {pages.map(([n, p]) => (
          <figure key={n} className={"rv-thumb " + (p.pass ? "pass" : "fail")} title={(p.issues || []).join("; ")} onClick={() => setOpen(p)}>
            <img src={thumb(p.url)} alt={n === "0" ? "Cover" : `Page ${n}`} loading="lazy" />
            <figcaption>{n === "0" ? "Cover" : n}{p.pass ? "" : " ✗"}</figcaption>
          </figure>
        ))}
      </div>
      <div className="rv-actions">
        <a className="rv-btn rv-primary" href={`/admin/create?recordId=${encodeURIComponent(o.id)}`}>
          {flagged.length ? `Fix ${flagged.length} page(s) & deliver →` : "Review & deliver →"}
        </a>
        <span className="rv-hint">{pages.length} illustration(s){flagged.length ? `, ${flagged.length} flagged` : ", all QA-passed"} — opens the create screen; hit “Load overnight candidate”.</span>
      </div>
      {open && (
        <div className="rv-lightbox" onClick={() => setOpen(null)}>
          <img src={thumb(open.url)} alt="Page preview" />
          {!open.pass && <p>{(open.issues || []).join("; ")}</p>}
        </div>
      )}
    </div>
  );
}

export default function ReviewClient({ initialOrders, loadError }: { initialOrders: AirtableOrder[]; loadError: string | null }) {
  const ready = useMemo(() => initialOrders.filter((o) => field(o, "Status") === "Ready for review"), [initialOrders]);
  const attention = useMemo(() => initialOrders.filter((o) => field(o, "Status") === "Needs attention"), [initialOrders]);
  const generating = useMemo(() => initialOrders.filter((o) => field(o, "Status") === "Generating"), [initialOrders]);

  return (
    <div className="rv-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="rv-topbar">
        <div>
          <h1>Review queue</h1>
          <p className="rv-sub">Overnight candidates awaiting a human. <a href="/admin">← dashboard</a> · <a href="/admin/create">create screen</a></p>
        </div>
      </div>
      {loadError && <p className="rv-error">{loadError}</p>}

      <h2>Needs attention ({attention.length})</h2>
      {attention.length === 0 && <p className="rv-quiet">Nothing flagged. 🎉</p>}
      {attention.map((o) => <Card key={o.id} o={o} />)}

      <h2>Ready for review ({ready.length})</h2>
      {ready.length === 0 && <p className="rv-quiet">No finished candidates waiting.</p>}
      {ready.map((o) => <Card key={o.id} o={o} />)}

      {generating.length > 0 && (
        <>
          <h2>Generating now ({generating.length})</h2>
          {generating.map((o) => {
            const st = pipeState(o);
            const done = Object.values(st?.pages || {}).filter((p) => p.pass).length;
            return (
              <p key={o.id} className="rv-quiet">
                <strong>{field(o, "Child name")}</strong> — {st?.phase === "pages" ? `${done} page(s) illustrated` : `phase: ${st?.phase || "starting"}`}
                {st?.updatedAt ? ` · last progress ${new Date(st.updatedAt).toLocaleTimeString()}` : ""}
              </p>
            );
          })}
        </>
      )}
    </div>
  );
}

const CSS = `
  .rv-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 64px; }
  .rv-topbar h1 { margin: 0; font-size: 1.7rem; color: #2f2a24; }
  .rv-sub { color: #7a7164; font-size: 0.92rem; margin: 2px 0 0; }
  .rv-sub a { color: #a15b2e; }
  .rv-wrap h2 { font-size: 1.1rem; color: #2f2a24; margin: 28px 0 10px; }
  .rv-quiet { color: #8c8478; }
  .rv-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 16px; padding: 16px 18px; margin-bottom: 16px; }
  .rv-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; flex-wrap: wrap; }
  .rv-child { font-weight: 800; font-size: 1.1rem; color: #2f2a24; }
  .rv-badge { border-radius: 999px; padding: 4px 12px; font-size: 0.78rem; font-weight: 700; background: #f1ece2; color: #7a7164; white-space: nowrap; }
  .rv-badge.ok { background: #e6f2e6; color: #2e6b34; }
  .rv-badge.bad { background: #fbe9e4; color: #a3341f; }
  .rv-error { color: #a3341f; background: #fbe9e4; border-radius: 10px; padding: 8px 12px; font-size: 0.9rem; }
  .rv-issues { color: #a3341f; font-size: 0.88rem; margin: 8px 0; padding-left: 20px; }
  .rv-strip { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; }
  .rv-thumb { margin: 0; flex: 0 0 auto; width: 86px; cursor: zoom-in; }
  .rv-thumb img { width: 86px; height: 130px; object-fit: cover; border-radius: 8px; border: 2px solid #e7e0d4; display: block; }
  .rv-thumb.pass img { border-color: #b9d8ba; }
  .rv-thumb.fail img { border-color: #e6a293; }
  .rv-thumb figcaption { text-align: center; font-size: 0.72rem; color: #7a7164; margin-top: 2px; }
  .rv-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
  .rv-btn { border: 1px solid #e7e0d4; border-radius: 999px; padding: 9px 16px; font-weight: 700; font-size: 0.9rem; text-decoration: none; color: #2f2a24; background: #fff; }
  .rv-primary { background: #2f2a24; color: #fff; border-color: #2f2a24; }
  .rv-hint { color: #8c8478; font-size: 0.82rem; }
  .rv-lightbox { position: fixed; inset: 0; background: rgba(30,25,20,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; z-index: 50; cursor: zoom-out; padding: 24px; }
  .rv-lightbox img { max-height: 86vh; max-width: 92vw; border-radius: 10px; }
  .rv-lightbox p { color: #ffd9cf; max-width: 640px; text-align: center; }
`;
