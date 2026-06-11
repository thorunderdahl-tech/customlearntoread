"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
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
type ArtQA = { pass: boolean; issues: string[] };

const field = (o: AirtableOrder, k: string) => (o.fields?.[k] ?? "") as string;

async function api(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}
const story = (b: Record<string, unknown>) => api("/api/admin/story", b);
const art = (b: Record<string, unknown>) => api("/api/admin/art", b);

function newToken(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  let t = "";
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  for (let i = 0; i < 8; i++) t += abc[a[i] % abc.length];
  return t;
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

async function downscale(dataUrl: string, w: number, q: number): Promise<string> {
  const img = await loadImg(dataUrl);
  const h = Math.round((img.height / img.width) * w);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", q);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("image decode failed")); i.src = src; });
}

async function fileToJpegB64(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const max = 1024;
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}

// Composite a book page: full-bleed art + typeset text band (text is never AI-rendered).
async function compositePage(artB64: string, text: string, pageNo: number, isCover: boolean): Promise<string> {
  const W = 1614, H = 2494; // 1009x1559pt page at ~1.6x
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  const img = await loadImg("data:image/png;base64," + artB64);
  const s = Math.max(W / img.width, H / img.height);
  ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);

  const bandH = Math.round(H * (isCover ? 0.16 : 0.2));
  ctx.fillStyle = "rgba(253,252,255,0.97)";
  ctx.fillRect(0, H - bandH, W, bandH);

  ctx.fillStyle = "#3b2a82";
  const fs = Math.round(isCover ? H * 0.034 : H * 0.026);
  ctx.font = `700 ${fs}px Inter, "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const maxW = W * 0.84;
  const ws = text.split(/\s+/); const lines: string[] = []; let line = "";
  for (const w of ws) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  const lh = fs * 1.35; const cy = H - bandH / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, cy + i * lh));

  if (!isCover) {
    ctx.fillStyle = "#e87dab";
    ctx.font = `600 ${Math.round(H * 0.013)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(String(pageNo), W * 0.045, H - H * 0.018);
  }
  return c.toDataURL("image/jpeg", 0.86);
}

export default function CreateClient({ initialOrders, loadError }: { initialOrders: AirtableOrder[]; loadError: string | null }) {
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get("recordId") || "");
  const [pageCount, setPageCount] = useState(20);
  const [levelId, setLevelId] = useState("");
  const [emotionalGoal, setEmotionalGoal] = useState("");
  const [mustUseWords, setMustUseWords] = useState("");
  const [avoidWords, setAvoidWords] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [order, setOrder] = useState<unknown>(null);
  const [saved, setSaved] = useState("");
  const [note, setNote] = useState("");

  // Phase 2: art + assembly + delivery
  const [charRef, setCharRef] = useState("");
  const [photoB64, setPhotoB64] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const [arts, setArts] = useState<Record<number, { img: string; qa?: ArtQA }>>({});
  const [artBusy, setArtBusy] = useState("");
  const [assembling, setAssembling] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [delivered, setDelivered] = useState<{ bookLink: string; pdfLink: string } | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);

  const candidates = useMemo(
    () => initialOrders.filter((o) => ["Paid", "Designing"].includes(field(o, "Status"))),
    [initialOrders],
  );
  const selected = candidates.find((o) => o.id === selectedId) || initialOrders.find((o) => o.id === selectedId);

  function resetAll() {
    setDraft(null); setGrade(null); setCheck(null); setSaved("");
    setCharRef(""); setArts({}); setPdfUrl(""); setPageImages([]); setDelivered(null);
  }

  async function generate() {
    if (!selectedId) return;
    setError(""); resetAll();
    try {
      setBusy("Writing the story…");
      const g = await story({ action: "generate", recordId: selectedId, pageCount, levelId: levelId || undefined, emotionalGoal: emotionalGoal || undefined, mustUseWords: mustUseWords.trim() || undefined, avoidWords: avoidWords.trim() || undefined });
      let d: Draft = g.draft; let c: Check = g.check;
      setDraft(d); setCheck(c); setOrder(g.order); setParentEmail(g.parentEmail || "");
      if (!c.pass) {
        setBusy("Rules check failed — revising…");
        const r = await story({ action: "revise", draft: d, issues: c.problems });
        d = r.draft; c = r.check; setDraft(d); setCheck(c);
      }
      setBusy("AI quality grading…");
      const q = await story({ action: "grade", draft: d, order: g.order });
      let gr: Grade = q.grade; setGrade(gr);
      if (!gr.pass && gr.issues?.length) {
        setBusy("Grader flagged issues — revising…");
        const r2 = await story({ action: "revise", draft: d, issues: gr.issues });
        d = r2.draft; setDraft(d); setCheck(r2.check);
        setBusy("Re-grading…");
        const q2 = await story({ action: "grade", draft: d, order: g.order });
        setGrade(q2.grade);
      }
      setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  async function reviseWithNote() {
    if (!draft || !note.trim()) return;
    setError("");
    try {
      setBusy("Revising with your note…");
      const r = await story({ action: "revise", draft, issues: [note.trim()] });
      setDraft(r.draft); setCheck(r.check); setNote(""); setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  async function save(approved: boolean) {
    if (!draft || !selectedId) return;
    setError("");
    try {
      setBusy("Saving to the order…");
      await story({ action: "save", recordId: selectedId, draft, approved });
      setSaved(approved ? "Story approved & saved." : "Draft saved to the order.");
      setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  const setPageText = (n: number, text: string) =>
    draft && setDraft({ ...draft, pages: draft.pages.map((p) => (p.n === n ? { ...p, text } : p)) });

  // ---------- art ----------
  async function genCharacter() {
    if (!draft) return;
    setError(""); setArtBusy("Drawing the character sheet…");
    try {
      const r = await art({ action: "character", description: draft.characterDescription, photo: photoB64 || undefined });
      setCharRef(r.image); setArts({}); setPdfUrl(""); setDelivered(null);
    } catch (e: any) { setError(e?.message || String(e)); }
    setArtBusy("");
  }

  async function genOnePage(n: number) {
    if (!draft || !charRef) return;
    const page = n === 0
      ? { n: 0, text: draft.title, artPrompt: draft.coverArtPrompt }
      : draft.pages.find((p) => p.n === n)!;
    const first = await art({ action: "page", artPrompt: page.artPrompt, characterDescription: draft.characterDescription, refs: [charRef] });
    let qa: ArtQA | undefined;
    try { qa = (await art({ action: "check", image: first.image, pageText: page.text, characterDescription: draft.characterDescription })).verdict; } catch { /* QA optional */ }
    if (qa && !qa.pass && qa.issues?.length) {
      const retry = await art({ action: "page", artPrompt: page.artPrompt, characterDescription: draft.characterDescription, refs: [charRef], fixNotes: qa.issues.join("; ") });
      let qa2: ArtQA | undefined;
      try { qa2 = (await art({ action: "check", image: retry.image, pageText: page.text, characterDescription: draft.characterDescription })).verdict; } catch { /* QA optional */ }
      setArts((a) => ({ ...a, [n]: { img: retry.image, qa: qa2 } }));
    } else {
      setArts((a) => ({ ...a, [n]: { img: first.image, qa } }));
    }
  }

  async function genAllArt() {
    if (!draft || !charRef) return;
    setError(""); setPdfUrl(""); setDelivered(null);
    const targets = [0, ...draft.pages.map((p) => p.n)];
    for (const n of targets) {
      setArtBusy(n === 0 ? "Illustrating the cover…" : `Illustrating page ${n} of ${draft.pages.length}…`);
      try { await genOnePage(n); }
      catch (e: any) { setError(`${n === 0 ? "Cover" : "Page " + n}: ${e?.message || e}`); break; }
    }
    setArtBusy("");
  }

  async function redoOne(n: number) {
    setError(""); setArtBusy(n === 0 ? "Redoing the cover…" : `Redoing page ${n}…`);
    try { await genOnePage(n); } catch (e: any) { setError(e?.message || String(e)); }
    setArtBusy("");
  }

  // ---------- assembly + delivery ----------
  const artDone = draft && charRef && [0, ...(draft?.pages.map((p) => p.n) || [])].every((n) => arts[n]);

  async function assemble() {
    if (!draft) return;
    setError(""); setDelivered(null);
    try {
      setAssembling("Typesetting pages…");
      const imgs: string[] = [await compositePage(arts[0].img, draft.title, 0, true)];
      for (const p of draft.pages) imgs.push(await compositePage(arts[p.n].img, p.text, p.n, false));
      setPageImages(imgs);
      setAssembling("Building the print PDF…");
      if (!(window as any).PDFLib) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "/flipbook/pdf-lib.min.js";
          s.onload = () => res(); s.onerror = () => rej(new Error("pdf-lib failed to load"));
          document.head.appendChild(s);
        });
      }
      const { PDFDocument } = (window as any).PDFLib;
      const doc = await PDFDocument.create();
      for (const dURL of imgs) {
        const jpg = await doc.embedJpg(await fetch(dURL).then((r) => r.arrayBuffer()));
        const page = doc.addPage([396, 612]); // 5.5in x 8.5in portrait
        page.drawImage(jpg, { x: 0, y: 0, width: 396, height: 612 });
      }
      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      pdfBlobRef.current = blob;
      setPdfUrl(URL.createObjectURL(blob));
      setAssembling("");
    } catch (e: any) { setError(e?.message || String(e)); setAssembling(""); }
  }

  async function deliverNow() {
    if (!draft || !pdfBlobRef.current || !pageImages.length) return;
    if (!/.+@.+\..+/.test(parentEmail)) { setError("Enter the customer's email."); return; }
    setError("");
    try {
      const token = `${slugify(draft.childName) || "book"}-${newToken()}`;
      setAssembling("Building the flipbook…");
      const tplRes = await fetch("/flipbook/template.html");
      if (!tplRes.ok) throw new Error("Couldn't load flipbook template");
      const template = await tplRes.text();
      // The print PDF keeps full resolution; the flipbook gets a lighter copy
      // so the page loads fast on phones.
      const flipPages = [];
      for (const d of pageImages) flipPages.push(await downscale(d, 1000, 0.8));
      const cfg = {
        title: draft.title, pageW: 1000, pageH: Math.round((2494 / 1614) * 1000), pages: flipPages,
        pdf: { mode: "url", url: `/books/${token}.pdf`, name: `${slugify(draft.title) || "book"}.pdf` },
      };
      const html = template
        .replace("__TITLE__", draft.title.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
        .replace("__CONFIG_JSON__", () => JSON.stringify(cfg).replace(/</g, "\\u003c"));
      setAssembling("Uploading the flipbook…");
      await upload(`books/${token}.html`, new Blob([html], { type: "text/html" }), { access: "public", handleUploadUrl: "/api/admin/blob", contentType: "text/html" });
      setAssembling("Uploading the print PDF…");
      await upload(`books/${token}.pdf`, pdfBlobRef.current, { access: "public", handleUploadUrl: "/api/admin/blob", contentType: "application/pdf" });
      setAssembling("Emailing the customer + updating the order…");
      const res = await api("/api/admin/deliver", { token, childName: draft.childName, bookTitle: draft.title, email: parentEmail, recordId: selectedId || undefined });
      setDelivered({ bookLink: res.bookLink, pdfLink: res.pdfLink });
      setAssembling("");
    } catch (e: any) { setError(e?.message || String(e)); setAssembling(""); }
  }

  const artTiles = draft ? [
    { n: 0, label: "Cover", text: draft.title },
    ...draft.pages.map((p) => ({ n: p.n, label: `Page ${p.n}`, text: p.text })),
  ] : [];

  return (
    <div className="crt-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="crt-top">
        <div>
          <h1>Create a book</h1>
          <p className="sub">Order → leveled story → illustrations → print PDF + flipbook → customer email. You approve at each step.</p>
        </div>
        <a className="crt-btn" href="/admin">&larr; Back to orders</a>
      </div>

      {loadError && <p className="crt-error">{loadError}</p>}

      <div className="crt-card">
        <h2>1 · Order</h2>
        <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); resetAll(); }}>
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
            <input type="number" min={4} max={24} value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 10)} />
          </label>
          <label>Level override (optional)
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Use order / age</option>
              <option value="tiny">Tiny Reader — 1-3 words a page</option>
              <option value="beginner">Beginner Reader — 3-6 words a page</option>
              <option value="growing">Growing Reader — one fuller sentence a page</option>
            </select>
          </label>
        </div>
        <div className="crt-row">
          <label>Emotional goal (optional)
            <select value={emotionalGoal} onChange={(e) => setEmotionalGoal(e.target.value)}>
              <option value="">Let the engine pick</option>
              <option>Confidence</option>
              <option>Friendship</option>
              <option>Kindness</option>
              <option>Trying Something New</option>
              <option>Teamwork</option>
              <option>Courage</option>
            </select>
          </label>
          <label>Must-use words (optional)
            <input value={mustUseWords} onChange={(e) => setMustUseWords(e.target.value)} placeholder="hop, dog, big" />
          </label>
          <label>Words to avoid (optional)
            <input value={avoidWords} onChange={(e) => setAvoidWords(e.target.value)} placeholder="scary, monster" />
          </label>
        </div>
        <button className="crt-btn crt-primary" disabled={!selectedId || !!busy} onClick={generate}>
          {busy || (draft ? "Regenerate from scratch" : "Generate story draft")}
        </button>
      </div>

      {draft && (
        <div className="crt-card">
          <h2>2 · Story — “{draft.title}”</h2>
          <div className="crt-badges">
            {check && <span className={"badge " + (check.pass ? "ok" : "bad")}>{check.pass ? "✓ Level rules pass" : `✗ ${check.problems.length} rule issue(s)`}</span>}
            {grade && <span className={"badge " + (grade.pass ? "ok" : "bad")}>{grade.pass ? `✓ QA grade ${grade.score}/10` : `✗ QA grade ${grade.score}/10`}</span>}
            <span className="badge">{check?.stats.totalWords ?? "?"} words · {draft.pages.length} pages</span>
          </div>
          {check && !check.pass && <ul className="crt-issues">{check.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {grade && !grade.pass && <ul className="crt-issues">{grade.issues.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {grade?.praise && <p className="hint">“{grade.praise}”</p>}
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
            <button className="crt-btn" disabled={!!busy} onClick={() => save(true)}>Approve story ✓</button>
          </div>
          {saved && <p className="crt-saved">{saved}</p>}
        </div>
      )}

      {draft && (
        <div className="crt-card">
          <h2>3 · Illustrations</h2>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhotoB64(await fileToJpegB64(f)); }} />
          {photoB64 ? (
            <p className="hint">✓ Reference photo attached — the character (and any pet in the photo) will be drawn from it, stylized, never photorealistic.{" "}
              <button className="crt-btn tsmall" onClick={() => setPhotoB64("")}>Remove</button></p>
          ) : (
            <p className="hint">Optional: <button className="crt-btn tsmall" onClick={() => photoInput.current?.click()}>Attach a reference photo</button> of the child (and pet) — the character sheet will match it. JPG or PNG.</p>
          )}
          {!charRef ? (
            <>
              <p className="hint">First, a character sheet locks {draft.childName}&rsquo;s look so every page matches.</p>
              <button className="crt-btn crt-primary" disabled={!!artBusy} onClick={genCharacter}>{artBusy || "Draw character sheet"}</button>
            </>
          ) : (
            <>
              <div className="crt-char">
                <img src={"data:image/png;base64," + charRef} alt="Character sheet" />
                <div>
                  <p className="hint">{draft.characterDescription}</p>
                  <div className="crt-actions" style={{ justifyContent: "flex-start" }}>
                    <button className="crt-btn" disabled={!!artBusy} onClick={genCharacter}>Redraw character</button>
                    <button className="crt-btn crt-primary" disabled={!!artBusy} onClick={genAllArt}>
                      {artBusy || (Object.keys(arts).length ? "Regenerate all pages" : `Illustrate cover + ${draft.pages.length} pages`)}
                    </button>
                  </div>
                </div>
              </div>
              {Object.keys(arts).length > 0 && (
                <div className="crt-grid">
                  {artTiles.map((t) => {
                    const a = arts[t.n];
                    return (
                      <div className="crt-tile" key={t.n}>
                        <div className="tlabel">{t.label} {a?.qa ? (a.qa.pass ? "✓" : "⚠") : ""}</div>
                        {a ? <img src={"data:image/png;base64," + a.img} alt={t.label} /> : <div className="tempty">…</div>}
                        {a?.qa && !a.qa.pass && <p className="tissue">{a.qa.issues.join("; ")}</p>}
                        <button className="crt-btn tsmall" disabled={!!artBusy} onClick={() => redoOne(t.n)}>Redo</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {artDone && (
        <div className="crt-card">
          <h2>4 · Assemble &amp; deliver</h2>
          <button className="crt-btn crt-primary" disabled={!!assembling} onClick={assemble}>{assembling || (pdfUrl ? "Re-assemble book" : "Assemble book")}</button>
          {pdfUrl && (
            <>
              <iframe className="crt-preview" src={pdfUrl} title="Book preview" />
              <p><a className="crt-btn" href={pdfUrl} download={(slugify(draft!.title) || "book") + ".pdf"}>Download print PDF</a></p>
              <div className="crt-row">
                <label>Customer email
                  <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
                </label>
              </div>
              {!delivered && (
                <button className="crt-btn crt-primary" disabled={!!assembling} onClick={deliverNow}>
                  {assembling || `Send book to ${parentEmail || "customer"} ✓`}
                </button>
              )}
              {delivered && (
                <div className="crt-done">
                  <p className="big">✓ Delivered!</p>
                  <p>Book link: <a href={delivered.bookLink} target="_blank" rel="noreferrer">{delivered.bookLink}</a></p>
                  <p>Print PDF: <a href={delivered.pdfLink} target="_blank" rel="noreferrer">{delivered.pdfLink}</a></p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="crt-error">{error}</p>}
    </div>
  );
}

const CSS = `
  .crt-wrap { max-width: 920px; margin: 0 auto; padding: 32px 20px 64px; color: #2f2a24; font-family: Inter, system-ui, sans-serif; }
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
  .crt-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
  .crt-saved { color: #2f5e38; font-weight: 700; }
  .crt-error { color: #b3261e; font-weight: 600; }
  .hint { font-size: .84rem; color: #7a7164; }
  .crt-char { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
  .crt-char img { width: 140px; border-radius: 10px; box-shadow: 0 3px 10px rgba(47,42,36,.18); }
  .crt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 14px; }
  .crt-tile { text-align: center; }
  .crt-tile img { width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(47,42,36,.15); }
  .crt-tile .tlabel { font-size: .74rem; font-weight: 800; color: #7a7164; margin-bottom: 4px; }
  .crt-tile .tissue { font-size: .7rem; color: #8c2f25; }
  .crt-tile .tsmall { padding: 4px 12px; font-size: .76rem; margin-top: 4px; }
  .tempty { height: 180px; background: #f6f0e4; border-radius: 8px; }
  .crt-preview { width: 100%; height: 560px; border: 1px solid #e7e0d4; border-radius: 12px; margin: 14px 0; background: #fff; }
  .crt-done .big { color: #2f5e38; font-weight: 800; font-size: 1.05rem; }
  .crt-done a { color: #b96e3c; word-break: break-all; }
  @media (max-width: 640px) { .crt-row, .crt-char { flex-direction: column; } }
`;
