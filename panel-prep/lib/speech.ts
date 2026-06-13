"use client";

// Browser speech recognition hook (Web Speech API — Chrome/Edge/Safari).
// Falls back gracefully: `supported` is false where the API is missing
// and callers should offer typing instead.

import { useEffect, useRef, useState } from "react";

type AnyRec = any;

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const recRef = useRef<AnyRec | null>(null);
  const keepAlive = useRef(false);

  useEffect(() => {
    const W = window as any;
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let fin = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t + " ";
        else inter += t;
      }
      if (fin) setFinalText((p) => (p + fin).replace(/\s+/g, " "));
      setInterim(inter);
    };
    // Chrome stops recognition after silences; restart while a take is live.
    rec.onend = () => {
      if (keepAlive.current) {
        try { rec.start(); } catch { /* already restarting */ }
      } else {
        setListening(false);
      }
    };
    rec.onerror = () => { /* mic hiccups shouldn't crash the take */ };
    recRef.current = rec;
    return () => {
      keepAlive.current = false;
      try { rec.stop(); } catch {}
    };
  }, []);

  function start() {
    if (!recRef.current) return;
    keepAlive.current = true;
    setFinalText("");
    setInterim("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {}
  }

  function stop() {
    keepAlive.current = false;
    try { recRef.current?.stop(); } catch {}
    setListening(false);
    setInterim("");
  }

  return {
    supported,
    listening,
    transcript: (finalText + " " + interim).replace(/\s+/g, " ").trim(),
    start,
    stop,
  };
}

const FILLER_RE = /\b(um+|uh+|erm+|ah{2,}|you know|sort of|kind of|i mean|basically)\b/gi;

/** Count filler words/phrases in a spoken transcript. */
export function countFillers(text: string): number {
  const m = text.match(FILLER_RE);
  return m ? m.length : 0;
}
