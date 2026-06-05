// Lightweight admin auth: an HMAC-signed session cookie.
// Uses Web Crypto so it works in BOTH the Edge middleware and Node API routes.
// No external dependencies, no database — a single owner password gate.

export const ADMIN_COOKIE = "clr_admin";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64url(new Uint8Array(sig));
}

/** Constant-time string comparison to avoid timing leaks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/** Build a signed session token: "<expiryMs>.<hmac>". */
export async function createSession(
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const payload = String(Date.now() + ttlMs);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

/** Verify a session token's signature and expiry. */
export async function verifySession(
  token: string | undefined | null,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (!safeEqual(sig, expected)) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return true;
}

/** Compare a submitted password to the configured one (constant time). */
export function checkPassword(
  input: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (!input || !expected) return false;
  return safeEqual(input, expected);
}

/** The signing secret: a dedicated secret, or fall back to the password. */
export function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}
