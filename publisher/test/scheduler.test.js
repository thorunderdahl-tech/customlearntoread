'use strict';

// Set config-affecting env BEFORE requiring any src module (config reads env at
// require time). node --test runs each test file in its own process.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-sched-'));
process.env.DATA_DIR = DATA_DIR;
process.env.RETRY_BASE_MS = '1000';
process.env.RETRY_MAX_MS = '10000';
process.env.RETRY_MAX_ATTEMPTS = '3';
delete process.env.DATABASE_URL; // force JSON backend

const test = require('node:test');
const assert = require('node:assert');

const { isDue, backoffMs, runDuePosts } = require('../src/scheduler');
const store = require('../src/store');

const NOW = Date.parse('2026-06-06T00:00:00Z');
const FUTURE = NOW + 365 * 24 * 3600 * 1000; // a year ahead — past every nextAttemptAt

function writeCalendar(entries) {
  fs.writeFileSync(path.join(DATA_DIR, 'calendar.json'), JSON.stringify(entries));
}
function readEntry(id) {
  const cal = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'calendar.json'), 'utf8'));
  return cal.find((e) => e.id === id);
}

test('isDue: scheduled + past publishAt is due', () => {
  assert.equal(isDue({ status: 'scheduled', publishAt: '2026-01-01T00:00:00Z' }, NOW), true);
});

test('isDue: future publishAt is not due', () => {
  assert.equal(isDue({ status: 'scheduled', publishAt: '2999-01-01T00:00:00Z' }, NOW), false);
});

test('isDue: non-scheduled status is never due', () => {
  for (const status of ['posted', 'failed']) {
    assert.equal(isDue({ status, publishAt: '2026-01-01T00:00:00Z' }, NOW), false);
  }
});

test('isDue: nextAttemptAt in the future gates retry', () => {
  const entry = { status: 'scheduled', publishAt: '2026-01-01T00:00:00Z', nextAttemptAt: '2999-01-01T00:00:00Z' };
  assert.equal(isDue(entry, NOW), false);
});

test('backoffMs: exponential and capped at maxMs', () => {
  assert.equal(backoffMs(1), 1000);
  assert.equal(backoffMs(2), 2000);
  assert.equal(backoffMs(3), 4000);
  assert.equal(backoffMs(20), 10000); // capped
});

test('failure path: retries then dead-letters after maxAttempts', async () => {
  // Bad contentId => deterministic failure on every tick.
  writeCalendar([
    { id: 'bad', channel: 'instagram', contentId: 'missing', publishAt: '2026-01-01T00:00:00Z', status: 'scheduled' },
  ]);
  fs.writeFileSync(path.join(DATA_DIR, 'content.json'), '[]');

  // FUTURE clears the nextAttemptAt gate so each tick re-attempts.
  let res = await runDuePosts({ now: FUTURE });
  assert.equal(res[0].status, 'retry-scheduled');
  assert.equal(readEntry('bad').attempts, 1);
  assert.ok(readEntry('bad').nextAttemptAt, 'nextAttemptAt set while retrying');

  res = await runDuePosts({ now: FUTURE });
  assert.equal(res[0].status, 'retry-scheduled');
  assert.equal(readEntry('bad').attempts, 2);

  res = await runDuePosts({ now: FUTURE });
  assert.equal(res[0].status, 'failed'); // dead-lettered at attempt 3
  assert.equal(readEntry('bad').status, 'failed');
  assert.equal(readEntry('bad').nextAttemptAt, undefined, 'nextAttemptAt cleared on dead-letter');

  // Dead-lettered entry is no longer picked up.
  res = await runDuePosts({ now: FUTURE });
  assert.equal(res.length, 0);
});

test('dry-run leaves entries scheduled (re-testable)', async () => {
  writeCalendar([
    { id: 'ok', channel: 'instagram', contentId: 'c1', publishAt: '2026-01-01T00:00:00Z', status: 'scheduled' },
  ]);
  fs.writeFileSync(
    path.join(DATA_DIR, 'content.json'),
    JSON.stringify([{ id: 'c1', caption: 'hi', mediaUrl: 'https://x/y.jpg', mediaType: 'IMAGE' }])
  );
  const res = await runDuePosts({ now: NOW });
  assert.equal(res[0].status, 'dry-run');
  assert.equal(readEntry('ok').status, 'scheduled');
});
