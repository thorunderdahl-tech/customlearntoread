"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next") || "/";
        // Only same-origin paths, never external URLs.
        window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/";
        return;
      }
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed.");
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="login-eyebrow">Panel Prep</p>
        <h1>Sign in</h1>
        <p className="login-sub">Enter the password to start practicing.</p>
        <label htmlFor="pw">Password</label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <style>{`
        .login-wrap {
          min-height: 90vh; display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
        }
        .login-card {
          width: 100%; max-width: 380px; background: var(--paper);
          border: 1px solid var(--line); border-radius: 20px;
          padding: 32px 28px; box-shadow: 0 12px 40px rgba(47,42,36,0.08);
          display: grid; gap: 10px;
        }
        .login-eyebrow {
          text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem;
          font-weight: 700; color: var(--accent); margin: 0;
        }
        .login-card h1 { margin: 0; font-size: 1.5rem; }
        .login-sub { margin: 0 0 8px; font-size: 0.92rem; }
        .login-card label { font-weight: 700; font-size: 0.85rem; }
        .login-card input {
          width: 100%; border: 1px solid var(--line); border-radius: 12px;
          padding: 12px 14px; font-size: 1rem;
        }
        .login-card input:focus { outline: 2px solid var(--peach); border-color: transparent; }
        .login-error { color: #b3261e; font-size: 0.88rem; margin: 2px 0 0; }
        .login-card button {
          margin-top: 6px; background: var(--ink); color: #fff; border: 0;
          border-radius: 999px; padding: 12px 18px; font-weight: 700; font-size: 1rem;
          cursor: pointer;
        }
        .login-card button:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
