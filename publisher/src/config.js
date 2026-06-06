'use strict';

const fs = require('fs');
const path = require('path');

// Minimal .env loader (no dotenv dependency) so `npm run post-now` works with
// zero installed packages. Existing process.env values always win.
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  let text;
  try {
    text = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return; // no .env file — fine, use process.env/defaults
    throw err;
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile();

const num = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const config = {
  // DRY_RUN defaults to true unless explicitly set to the string "false".
  dryRun: process.env.DRY_RUN !== 'false',
  port: num(process.env.PORT, 3000),
  cronSchedule: process.env.CRON_SCHEDULE || '* * * * *',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
  databaseUrl: process.env.DATABASE_URL || null,

  instagram: {
    userId: process.env.IG_USER_ID || null,
    accessToken: process.env.IG_ACCESS_TOKEN || null,
    appId: process.env.IG_APP_ID || null,
    appSecret: process.env.IG_APP_SECRET || null,
    graphVersion: process.env.IG_GRAPH_VERSION || 'v21.0',
  },

  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || null,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || null,
    accessToken: process.env.TIKTOK_ACCESS_TOKEN || null,
    refreshToken: process.env.TIKTOK_REFRESH_TOKEN || null,
  },

  poll: {
    intervalMs: num(process.env.POLL_INTERVAL_MS, 3000),
    maxAttempts: num(process.env.POLL_MAX_ATTEMPTS, 20),
  },

  // Refresh a token if it expires within this many seconds.
  tokenRefreshSkewSeconds: num(process.env.TOKEN_REFRESH_SKEW_SECONDS, 86400),
};

module.exports = config;
