"use client";

import { useState } from "react";

export default function FooterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      setStatus("success");
      setMessage("Thanks! Check your inbox.");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Could not subscribe. Try again later.");
    }
  }

  return (
    <div className="footer-signup">
      <p className="heading">Tips for early readers, in your inbox.</p>
      <p className="sub">
        Short, practical ideas for helping a brand-new reader love books. No spam.
        Unsubscribe any time.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          aria-label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>
      {message && (
        <p className={`msg ${status === "success" ? "success" : status === "error" ? "error" : ""}`}>
          {message}
        </p>
      )}
    </div>
  );
}
