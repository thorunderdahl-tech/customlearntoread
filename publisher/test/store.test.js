'use strict';

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-store-'));
process.env.DATA_DIR = DATA_DIR;
delete process.env.DATABASE_URL; // JSON backend

const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/store');

test('init creates data dir + log file', async () => {
  await store.init();
  assert.ok(fs.existsSync(path.join(DATA_DIR, 'log.json')));
});

test('upsertContent inserts then updates', async () => {
  await store.upsertContent({ id: 'c1', caption: 'first', mediaUrl: 'https://x/a.jpg', mediaType: 'IMAGE' });
  assert.equal((await store.getContent('c1')).caption, 'first');
  await store.upsertContent({ id: 'c1', caption: 'second', mediaUrl: 'https://x/a.jpg', mediaType: 'IMAGE' });
  assert.equal((await store.getContent('c1')).caption, 'second');
});

test('upsertEntry defaults status to scheduled', async () => {
  const e = await store.upsertEntry({ id: 'e1', channel: 'tiktok', contentId: 'c1', publishAt: '2026-01-01T00:00:00Z' });
  assert.equal(e.status, 'scheduled');
});

test('updateEntryStatus persists retry fields and clears them', async () => {
  await store.updateEntryStatus('e1', 'scheduled', { attempts: 2, nextAttemptAt: '2026-02-01T00:00:00Z', error: 'boom' });
  let e = (await store.getCalendar()).find((x) => x.id === 'e1');
  assert.equal(e.attempts, 2);
  assert.equal(e.nextAttemptAt, '2026-02-01T00:00:00Z');
  assert.equal(e.error, 'boom');

  // Posting clears the transient retry/error fields.
  await store.updateEntryStatus('e1', 'posted', { postedAt: '2026-01-01T01:00:00Z', remoteId: 'R1', attempts: 0 });
  e = (await store.getCalendar()).find((x) => x.id === 'e1');
  assert.equal(e.status, 'posted');
  assert.equal(e.remoteId, 'R1');
  assert.equal(e.nextAttemptAt, undefined);
  assert.equal(e.error, undefined);
});

test('saveTokens merges and getTokens reads back', async () => {
  await store.saveTokens('tiktok', { accessToken: 'a1', refreshToken: 'r1', expiresAt: '2026-01-01T00:00:00Z' });
  await store.saveTokens('tiktok', { accessToken: 'a2' }); // partial update keeps refreshToken
  const t = await store.getTokens('tiktok');
  assert.equal(t.accessToken, 'a2');
  assert.equal(t.refreshToken, 'r1');
});

test('appendLog then getLog returns the record', async () => {
  await store.appendLog({ entryId: 'e1', channel: 'tiktok', status: 'posted', detail: { ok: true } });
  const log = await store.getLog();
  assert.ok(log.some((r) => r.entryId === 'e1' && r.status === 'posted'));
});
