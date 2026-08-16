'use strict';

// OAuth token storage + refresh for Instagram and TikTok.
//
// Long-lived tokens expire (IG ~60 days, TikTok access ~24h with a longer-lived
// refresh token). Current tokens live in the store (so refreshed values survive
// restarts); the env vars in config seed the very first run. Call
// `getValidToken(platform)` right before an API call — it refreshes when the
// stored token is missing or within TOKEN_REFRESH_SKEW_SECONDS of expiry.

const config = require('./config');
const logger = require('./logger');
const store = require('./store');

function bootstrap(platform) {
  if (platform === 'instagram') {
    return { accessToken: config.instagram.accessToken };
  }
  if (platform === 'tiktok') {
    return { accessToken: config.tiktok.accessToken, refreshToken: config.tiktok.refreshToken };
  }
  throw new Error(`Unknown platform "${platform}"`);
}

function isFresh(rec) {
  if (!rec || !rec.accessToken) return false;
  // Unknown expiry => assume the operator-provided token is currently usable.
  if (!rec.expiresAt) return true;
  const skewMs = config.tokenRefreshSkewSeconds * 1000;
  return Date.now() + skewMs < new Date(rec.expiresAt).getTime();
}

function expiresAtFrom(expiresInSeconds) {
  return expiresInSeconds
    ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    : null;
}

// Refresh a long-lived Facebook/IG token by exchanging it for a fresh one.
async function refreshInstagram(rec) {
  const { appId, appSecret, graphVersion } = config.instagram;
  if (!appId || !appSecret || !rec.accessToken) {
    throw new Error('Cannot refresh IG token: need IG_APP_ID, IG_APP_SECRET and an existing token');
  }
  const url =
    `https://graph.facebook.com/${graphVersion}/oauth/access_token` +
    `?grant_type=fb_exchange_token&client_id=${appId}` +
    `&client_secret=${appSecret}&fb_exchange_token=${rec.accessToken}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(`IG token refresh failed (${res.status}): ${JSON.stringify(json)}`);
  return { accessToken: json.access_token, expiresAt: expiresAtFrom(json.expires_in) };
}

// Refresh a TikTok access token using the refresh_token grant.
async function refreshTiktok(rec) {
  const { clientKey, clientSecret } = config.tiktok;
  if (!clientKey || !clientSecret || !rec.refreshToken) {
    throw new Error('Cannot refresh TikTok token: need TIKTOK_CLIENT_KEY/SECRET and a refresh token');
  }
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: rec.refreshToken,
  });
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`TikTok token refresh failed (${res.status}): ${JSON.stringify(json.error || json)}`);
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || rec.refreshToken,
    expiresAt: expiresAtFrom(json.expires_in),
  };
}

const REFRESHERS = { instagram: refreshInstagram, tiktok: refreshTiktok };

async function currentRecord(platform) {
  const stored = await store.getTokens(platform);
  return stored && stored.accessToken ? stored : bootstrap(platform);
}

async function getValidToken(platform) {
  const rec = await currentRecord(platform);

  if (config.dryRun) {
    logger.info(`[DRY_RUN] using ${platform} token as-is (no refresh in dry-run)`);
    return rec.accessToken || `DRY_RUN_${platform.toUpperCase()}_TOKEN`;
  }

  if (isFresh(rec)) return rec.accessToken;

  logger.info(`${platform} token missing or expiring — refreshing`);
  const refreshed = await REFRESHERS[platform](rec);
  const saved = await store.saveTokens(platform, { ...rec, ...refreshed });
  logger.info(`${platform} token refreshed (expiresAt=${saved.expiresAt || 'unknown'})`);
  return saved.accessToken;
}

// Force a refresh regardless of expiry (handy for a cron or manual rotation).
async function refreshNow(platform) {
  const rec = await currentRecord(platform);
  const refreshed = await REFRESHERS[platform](rec);
  return store.saveTokens(platform, { ...rec, ...refreshed });
}

module.exports = { getValidToken, refreshNow, isFresh };
