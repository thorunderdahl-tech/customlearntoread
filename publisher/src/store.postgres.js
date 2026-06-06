'use strict';

// Postgres storage backend (e.g. Railway). Active when DATABASE_URL is set.
// `pg` is required lazily so the JSON backend (and dry-run) need nothing installed.
// Exposes the same async API as store.json.js.

const config = require('./config');

let pool;
function getPool() {
  if (pool) return pool;
  const { Pool } = require('pg'); // lazy: only loaded when this backend is used
  const url = config.databaseUrl;
  const needsSsl = config.pgSsl || /sslmode=require/i.test(url || '');
  pool = new Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

const query = (text, params) => getPool().query(text, params);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  caption TEXT,
  media_url TEXT,
  media_type TEXT
);
CREATE TABLE IF NOT EXISTS calendar_entries (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  content_id TEXT,
  publish_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  theme TEXT,
  posted_at TIMESTAMPTZ,
  remote_id TEXT,
  error TEXT
);
CREATE TABLE IF NOT EXISTS post_log (
  id BIGSERIAL PRIMARY KEY,
  entry_id TEXT,
  channel TEXT,
  status TEXT,
  detail JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oauth_tokens (
  platform TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function init() {
  await query(SCHEMA);
}

function rowToEntry(r) {
  const entry = {
    id: r.id,
    channel: r.channel,
    contentId: r.content_id,
    publishAt: r.publish_at ? r.publish_at.toISOString() : null,
    status: r.status,
    theme: r.theme,
  };
  if (r.posted_at) entry.postedAt = r.posted_at.toISOString();
  if (r.remote_id) entry.remoteId = r.remote_id;
  if (r.error) entry.error = r.error;
  return entry;
}

function rowToContent(r) {
  return { id: r.id, caption: r.caption, mediaUrl: r.media_url, mediaType: r.media_type };
}

async function getCalendar() {
  const { rows } = await query('SELECT * FROM calendar_entries ORDER BY publish_at NULLS LAST');
  return rows.map(rowToEntry);
}

async function getContentMap() {
  const { rows } = await query('SELECT * FROM content');
  const map = new Map();
  for (const r of rows) map.set(r.id, rowToContent(r));
  return map;
}

async function getContent(id) {
  const { rows } = await query('SELECT * FROM content WHERE id = $1', [id]);
  return rows[0] ? rowToContent(rows[0]) : null;
}

async function updateEntryStatus(id, status, meta = {}) {
  await query(
    `UPDATE calendar_entries
        SET status = $2,
            posted_at = COALESCE($3, posted_at),
            remote_id = COALESCE($4, remote_id),
            error = $5
      WHERE id = $1`,
    [id, status, meta.postedAt || null, meta.remoteId || null, meta.error || null]
  );
}

async function appendLog(record) {
  const { entryId, channel, status, detail, error } = record;
  await query(
    `INSERT INTO post_log (entry_id, channel, status, detail, error)
     VALUES ($1, $2, $3, $4, $5)`,
    [entryId || null, channel || null, status || null, detail ? JSON.stringify(detail) : null, error || null]
  );
}

async function getTokens(platform) {
  const { rows } = await query('SELECT * FROM oauth_tokens WHERE platform = $1', [platform]);
  const r = rows[0];
  if (!r) return null;
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}

async function saveTokens(platform, tokens) {
  const merged = { ...((await getTokens(platform)) || {}), ...tokens };
  await query(
    `INSERT INTO oauth_tokens (platform, access_token, refresh_token, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (platform) DO UPDATE
       SET access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           updated_at = now()`,
    [platform, merged.accessToken || null, merged.refreshToken || null, merged.expiresAt || null]
  );
  return getTokens(platform);
}

// Seed tables from plain JS lists (used by migrate.js). Content is upserted;
// calendar entries are inserted only if absent, so live statuses are preserved.
async function seed({ content = [], calendar = [] }) {
  for (const c of content) {
    await query(
      `INSERT INTO content (id, caption, media_url, media_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET caption = EXCLUDED.caption,
             media_url = EXCLUDED.media_url,
             media_type = EXCLUDED.media_type`,
      [c.id, c.caption || null, c.mediaUrl || null, c.mediaType || null]
    );
  }
  for (const e of calendar) {
    await query(
      `INSERT INTO calendar_entries (id, channel, content_id, publish_at, status, theme)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [e.id, e.channel, e.contentId || null, e.publishAt || null, e.status || 'scheduled', e.theme || null]
    );
  }
  return { content: content.length, calendar: calendar.length };
}

async function close() {
  if (pool) await pool.end();
}

module.exports = {
  init,
  getCalendar,
  getContentMap,
  getContent,
  updateEntryStatus,
  appendLog,
  getTokens,
  saveTokens,
  seed,
  close,
};
