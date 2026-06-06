'use strict';

// JSON-file persistence for calendar / content / log / tokens.
//
// NOTE: Task 4 of the checklist swaps this for a backend selector that uses
// Postgres when DATABASE_URL is set. The public async API defined here is the
// contract every backend must implement, so callers never change.

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
  writeJson(CALENDAR(), cal);
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

module.exports = {
  init,
  getCalendar,
  getContentMap,
  getContent,
  updateEntryStatus,
  appendLog,
  getTokens,
  saveTokens,
};
