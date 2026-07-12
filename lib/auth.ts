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
  // Trim both sides so a stray trailing space/newline (a common paste artifact
  // when setting the env var) can't lock the owner out.
  return safeEqual(input.trim(), expected.trim());
}

/** The signing secret: a dedicated secret, or fall back to the password. */
export function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

/** Short HMAC tag binding a value (e.g. an order id) to a purpose, for signing
 * public one-click links so they can't be enumerated or tampered. 12 base64url
 * chars ≈ 72 bits — plenty for a link that also names a real record id.
 * Uses the admin session secret so no new env var is required. */
export async function signTag(value: string, purpose: string): Promise<string> {
  const secret = sessionSecret();
  if (!secret) return "";
  return (await hmac(secret, `${purpose}:${value}`)).slice(0, 12);
}

/** Verify a signTag() tag in constant time. */
export async function verifyTag(value: string, purpose: string, tag: string | undefined | null): Promise<boolean> {
  if (!tag) return false;
  const expected = await signTag(value, purpose);
  return !!expected && safeEqual(tag, expected);
}
