"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next") || "/admin";
        window.location.href =
          next.startsWith("/admin") || next.startsWith("/interview") ? next : "/admin";
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
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <p className="admin-login-eyebrow">CustomLearnToRead</p>
        <h1>Admin sign in</h1>
        <p className="admin-login-sub">Enter the admin password to manage orders.</p>
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
        {error && <p className="admin-login-error">{error}</p>}
        <button type="submit" disabled={loading || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <style>{`
        .admin-login-wrap {
          min-height: 70vh; display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
        }
        .admin-login-card {
          width: 100%; max-width: 380px; background: #fff;
          border: 1px solid var(--line, #e7e0d4); border-radius: 20px;
          padding: 32px 28px; box-shadow: 0 12px 40px rgba(47,42,36,0.08);
          display: grid; gap: 10px;
        }
        .admin-login-eyebrow {
          text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem;
          font-weight: 700; color: #8c5b37; margin: 0;
        }
        .admin-login-card h1 { margin: 0; font-size: 1.5rem; color: var(--ink, #2f2a24); }
        .admin-login-sub { margin: 0 0 8px; color: var(--muted, #7a7164); font-size: 0.92rem; }
        .admin-login-card label { font-weight: 700; font-size: 0.85rem; color: var(--ink, #2f2a24); }
        .admin-login-card input {
          width: 100%; border: 1px solid var(--line, #e7e0d4); border-radius: 12px;
          padding: 12px 14px; font-size: 1rem;
        }
        .admin-login-card input:focus { outline: 2px solid var(--peach, #f5b78d); border-color: transparent; }
        .admin-login-error { color: #b3261e; font-size: 0.88rem; margin: 2px 0 0; }
        .admin-login-card button {
          margin-top: 6px; background: var(--ink, #2f2a24); color: #fff; border: 0;
          border-radius: 999px; padding: 12px 18px; font-weight: 700; font-size: 1rem;
          cursor: pointer;
        }
        .admin-login-card button:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
