'use strict';

// JSON-file storage backend. Default when DATABASE_URL is unset.

const fs = require('fs');
const path = require('path');
const config = require('./config');

const file = (name) => path.join(config.dataDir, name);
const CALENDAR = () => file('calendar.json');
const CONTENT = () => file('content.json');
const LOG = () => file('log.json');
const TOKENS = () => file('tokens.json');

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

async function init() {
  if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
  if (!fs.existsSync(LOG())) writeJson(LOG(), []);
}

async function getCalendar() {
  return readJson(CALENDAR(), []);
}

async function getContentMap() {
  const list = readJson(CONTENT(), []);
  const map = new Map();
  for (const c of list) map.set(c.id, c);
  return map;
}

async function getContent(id) {
  return (await getContentMap()).get(id) || null;
}

async function updateEntryStatus(id, status, meta = {}) {
  const cal = readJson(CALENDAR(), []);
  const entry = cal.find((e) => e.id === id);
  if (!entry) return;
  entry.status = status;
  if (meta.postedAt) entry.postedAt = meta.postedAt;
  if (meta.remoteId) entry.remoteId = meta.remoteId;
  if (meta.error) entry.error = meta.error;
  else delete entry.error;
  if (meta.attempts !== undefined) entry.attempts = meta.attempts;
  // nextAttemptAt is only kept while a retry is pending; cleared otherwise.
  if (meta.nextAttemptAt) entry.nextAttemptAt = meta.nextAttemptAt;
  else delete entry.nextAttemptAt;
  writeJson(CALENDAR(), cal);
}

async function upsertContent(content) {
  const list = readJson(CONTENT(), []);
  const i = list.findIndex((c) => c.id === content.id);
  if (i >= 0) list[i] = { ...list[i], ...content };
  else list.push(content);
  writeJson(CONTENT(), list);
  return i >= 0 ? list[i] : content;
}

async function upsertEntry(entry) {
  const cal = readJson(CALENDAR(), []);
  const i = cal.findIndex((e) => e.id === entry.id);
  const merged = i >= 0 ? { ...cal[i], ...entry } : { status: 'scheduled', ...entry };
  if (i >= 0) cal[i] = merged;
  else cal.push(merged);
  writeJson(CALENDAR(), cal);
  return merged;
}

async function appendLog(record) {
  const log = readJson(LOG(), []);
  log.push({ ...record, at: new Date().toISOString() });
  writeJson(LOG(), log);
}

async function getTokens(platform) {
  const all = readJson(TOKENS(), {});
  return all[platform] || null;
}

async function saveTokens(platform, tokens) {
  const all = readJson(TOKENS(), {});
  all[platform] = { ...(all[platform] || {}), ...tokens, updatedAt: new Date().toISOString() };
  writeJson(TOKENS(), all);
  return all[platform];
}

async function getLog() {
  return readJson(LOG(), []);
}

module.exports = {
  init,
  getCalendar,
  getContentMap,
  getContent,
  updateEntryStatus,
  upsertContent,
  upsertEntry,
  appendLog,
  getLog,
  getTokens,
  saveTokens,
};
