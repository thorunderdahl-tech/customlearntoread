"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";

const PDFJS_VERSION = "3.11.174";
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

type Phase = "idle" | "rendering" | "preview" | "sending" | "done";

function newToken(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  let t = "";
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  for (let i = 0; i < 8; i++) t += abc[a[i] % abc.length];
  return t;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
}

let pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) return reject(new Error("pdf.js failed to initialise"));
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(lib);
    };
    s.onerror = () => reject(new Error("Couldn't load pdf.js (are you online?)"));
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

export default function DeliverClient() {
  const params = useSearchParams();
  const [childName, setChildName] = useState(params.get("child") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [bookTitle, setBookTitle] = useState("");
  const recordId = params.get("recordId") || "";

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<{ bookLink: string; pdfLink: string; airtableOk: boolean } | null>(null);

  const htmlRef = useRef<string>("");
  const tokenRef = useRef<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (childName && !bookTitle) setBookTitle(`${childName} Learns to Read`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childName]);

  function pickFile(f: File) {
    if (!/\.pdf$/i.test(f.name)) { setError("Please choose a PDF file."); return; }
    setError("");
    setFile(f);
    setPhase("idle");
    setPreviewUrl("");
    setResult(null);
  }

  async function buildPreview() {
    if (!file) return;
    setError("");
    setPhase("rendering");
    try {
      setProgress("Loading the flipbook template…");
      const tplRes = await fetch("/flipbook/template.html");
      if (!tplRes.ok) throw new Error("Couldn't load /flipbook/template.html");
      const template = await tplRes.text();

      setProgress("Opening the PDF…");
      const pdfjs = await loadPdfJs();
      const data = new Uint8Array(await file.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;

      const targetW = 1300;
      const pages: string[] = [];
      let pageH = 0;
      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(`Rendering page ${i} of ${doc.numPages}…`);
        const page = await doc.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: targetW / vp1.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        if (i === 1) pageH = canvas.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        pages.push(canvas.toDataURL("image/jpeg", 0.82));
      }

      const token = `${slugify(childName) || "book"}-${newToken()}`;
      tokenRef.current = token;
      const title = bookTitle.trim() || `${childName}'s Book`;
      const cfg = {
        title,
        pageW: targetW,
        pageH,
        pages,
        pdf: { mode: "url", url: `/books/${token}.pdf`, name: `${slugify(title) || "book"}.pdf` },
      };
      const html = template
        .replace("__TITLE__", title.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
        .replace("__CONFIG_JSON__", () => JSON.stringify(cfg).replace(/</g, "\\u003c"));
      htmlRef.current = html;
      setPreviewUrl(URL.createObjectURL(new Blob([html], { type: "text/html" })));
      setPhase("preview");
      setProgress("");
    } catch (e: any) {
      setError(e?.message || String(e));
      setPhase("idle");
    }
  }

  async function send() {
    if (!file || !htmlRef.current || !tokenRef.current) return;
    if (!/.+@.+\..+/.test(email)) { setError("Enter the customer's email address."); return; }
    setError("");
    setPhase("sending");
    const token = tokenRef.current;
    try {
      setProgress("Uploading the flipbook…");
      await upload(`books/${token}.html`, new Blob([htmlRef.current], { type: "text/html" }), {
        access: "public",
        handleUploadUrl: "/api/admin/blob",
        contentType: "text/html",
      });
      setProgress("Uploading the print PDF…");
      await upload(`books/${token}.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob",
        contentType: "application/pdf",
      });
      setProgress("Sending the email + updating the order…");
      const res = await fetch("/api/admin/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, childName, bookTitle, email, recordId: recordId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delivery failed");
      setResult(data);
      setPhase("done");
      setProgress("");
    } catch (e: any) {
      setError(e?.message || String(e));
      setPhase("preview");
    }
  }

  return (
    <div className="dlv-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="dlv-top">
        <div>
          <h1>Deliver a book</h1>
          <p className="sub">Drop the finished PDF — get a flipbook link, customer email, and order update in one click.</p>
        </div>
        <a className="dlv-btn" href="/admin">&larr; Back to orders</a>
      </div>

      <div className="dlv-card">
        <h2>1 · Book details</h2>
        <div className="dlv-row">
          <div>
            <label>Child&rsquo;s name</label>
            <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Emma" />
          </div>
          <div>
            <label>Customer email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
          </div>
        </div>
        <label>Book title (shown above the book)</label>
        <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="Emma Learns to Read" />
        {recordId ? <p className="hint">Linked to Airtable order <code>{recordId}</code> — it&rsquo;ll be marked Delivered.</p> : <p className="hint">No order linked (opened without an order) — Airtable won&rsquo;t be updated.</p>}
      </div>

      <div className="dlv-card">
        <h2>2 · Finished book PDF</h2>
        <div
          className={"dlv-drop" + (dragOver ? " over" : "")}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); }}
        >
          {file ? <span className="ok">✓ {file.name} ({(file.size / 1048576).toFixed(1)} MB) — click to change</span> : <span><strong>Drop the PDF here</strong> or click to choose</span>}
        </div>
        <input ref={fileInput} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
        <button className="dlv-btn dlv-primary" disabled={!file || phase === "rendering"} onClick={buildPreview}>
          {phase === "rendering" ? progress || "Working…" : "Build flipbook preview"}
        </button>
      </div>

      {(phase === "preview" || phase === "sending" || phase === "done") && (
        <div className="dlv-card">
          <h2>3 · Preview &amp; send</h2>
          {previewUrl && <iframe className="dlv-preview" src={previewUrl} title="Flipbook preview" />}
          {phase !== "done" && (
            <button className="dlv-btn dlv-primary" disabled={phase === "sending"} onClick={send}>
              {phase === "sending" ? progress || "Sending…" : `Send to ${email || "customer"}`}
            </button>
          )}
          {phase === "done" && result && (
            <div className="dlv-done">
              <p className="big">✓ Delivered!</p>
              <p>Book link: <a href={result.bookLink} target="_blank" rel="noreferrer">{result.bookLink}</a></p>
              <p>Print PDF: <a href={result.pdfLink} target="_blank" rel="noreferrer">{result.pdfLink}</a></p>
              <p>{recordId ? (result.airtableOk ? "Airtable order marked Delivered." : "⚠ Email sent, but the Airtable update failed — set it manually.") : "No Airtable order was linked."}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="dlv-error">{error}</p>}
    </div>
  );
}

const CSS = `
  .dlv-wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 64px; color: #2f2a24; }
  .dlv-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .dlv-top h1 { margin: 0; font-size: 1.7rem; }
  .dlv-top .sub { color: #7a7164; margin: 4px 0 0; font-size: .92rem; }
  .dlv-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 16px; padding: 22px; margin-bottom: 16px; }
  .dlv-card h2 { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #7a7164; margin: 0 0 14px; }
  .dlv-card label { display: block; font-size: .82rem; font-weight: 700; margin: 12px 0 5px; }
  .dlv-card input { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: .95rem; border: 1.5px solid #e0d8c8; border-radius: 10px; background: #fffdf8; }
  .dlv-row { display: flex; gap: 14px; } .dlv-row > div { flex: 1; }
  .dlv-drop { border: 2px dashed #d8cfbc; border-radius: 14px; padding: 34px 16px; text-align: center; cursor: pointer; color: #7a7164; font-size: .95rem; margin-bottom: 14px; }
  .dlv-drop.over, .dlv-drop:hover { border-color: #f5b78d; background: #fdf4e9; }
  .dlv-drop .ok { color: #3c7a45; font-weight: 700; }
  .dlv-btn { border: 1px solid #e7e0d4; background: #fff; color: #2f2a24; border-radius: 999px; padding: 10px 18px; font-weight: 700; font-size: .92rem; cursor: pointer; text-decoration: none; display: inline-block; }
  .dlv-primary { background: #f5b78d; border-color: #f5b78d; color: #4a3520; }
  .dlv-primary:disabled { opacity: .55; cursor: not-allowed; }
  .dlv-preview { width: 100%; height: 560px; border: 1px solid #e7e0d4; border-radius: 12px; margin-bottom: 14px; background: #fff8ed; }
  .dlv-done .big { color: #3c7a45; font-weight: 800; font-size: 1.05rem; }
  .dlv-done a { color: #b96e3c; word-break: break-all; }
  .dlv-error { color: #b3261e; font-weight: 600; }
  .hint { font-size: .82rem; color: #7a7164; margin: 10px 0 0; } .hint code { background: #f6f0e4; padding: 1px 6px; border-radius: 5px; }
  @media (max-width: 640px) { .dlv-row { flex-direction: column; } }
`;
