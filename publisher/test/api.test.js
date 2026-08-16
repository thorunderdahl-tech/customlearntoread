'use strict';

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-api-'));
process.env.DATA_DIR = DATA_DIR;
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-api-up-'));
process.env.API_KEY = 'secret';
delete process.env.DATABASE_URL;
delete process.env.ANTHROPIC_API_KEY;
fs.writeFileSync(path.join(DATA_DIR, 'calendar.json'), '[]');
fs.writeFileSync(path.join(DATA_DIR, 'content.json'), '[]');

const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../src/api');

let server;
let base;
const KEY = { 'X-API-Key': 'secret', 'Content-Type': 'application/json' };

test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test('GET /health needs no auth', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('write without API key is 401', async () => {
  const res = await fetch(`${base}/content`, { method: 'POST', body: '{}' });
  assert.equal(res.status, 401);
});

test('POST /content validates required fields', async () => {
  const res = await fetch(`${base}/content`, { method: 'POST', headers: KEY, body: JSON.stringify({ caption: 'x' }) });
  assert.equal(res.status, 400);
});

test('POST /studio/schedule creates content + entry', async () => {
  const res = await fetch(`${base}/studio/schedule`, {
    method: 'POST',
    headers: KEY,
    body: JSON.stringify({
      content: { caption: 'Lily!', mediaUrl: 'https://x/lily.jpg', mediaType: 'IMAGE' },
      channel: 'instagram',
      publishAt: '2026-01-05T10:00:00.000Z',
      theme: 'name-book',
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.content.id && body.entry.id);
  assert.equal(body.entry.contentId, body.content.id);

  const cal = await (await fetch(`${base}/calendar`, { headers: KEY })).json();
  assert.equal(cal.length, 1);
});

test('GET /insights returns a feed shape', async () => {
  const feed = await (await fetch(`${base}/insights`, { headers: KEY })).json();
  assert.ok(Array.isArray(feed.items));
  assert.equal(typeof feed.count, 'number');
});

test('GET / serves the Studio UI (no auth)', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /Studio/);
});

test('POST /captions/generate returns captions', async () => {
  const res = await fetch(`${base}/captions/generate`, {
    method: 'POST', headers: KEY, body: JSON.stringify({ childName: 'Lily', theme: 'ocean', count: 2 }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.captions.length, 2);
});

test('POST /render returns a media url', async () => {
  const res = await fetch(`${base}/render`, {
    method: 'POST', headers: KEY, body: JSON.stringify({ childName: 'Sam', theme: 'dino' }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.ok(body.url.includes('/media/'));
});

test('media upload then fetch round-trips', async () => {
  const up = await fetch(`${base}/media/upload?filename=t.png`, {
    method: 'POST', headers: { 'X-API-Key': 'secret', 'Content-Type': 'image/png' }, body: Buffer.from('PNGBYTES'),
  });
  const saved = await up.json();
  assert.equal(up.status, 201);
  assert.equal(saved.mediaType, 'IMAGE');
  // Media is public — no key needed to fetch.
  const got = await fetch(`${base}/media/${saved.filename}`);
  assert.equal(got.status, 200);
  assert.equal(await got.text(), 'PNGBYTES');
});

test('failures + retry round-trip', async () => {
  // Seed a dead-lettered entry directly, then requeue via the API.
  const store = require('../src/store');
  await store.upsertEntry({ id: 'dead', channel: 'tiktok', contentId: 'c', publishAt: '2026-01-01T00:00:00Z', status: 'failed' });

  let failures = await (await fetch(`${base}/failures`, { headers: KEY })).json();
  assert.ok(failures.some((e) => e.id === 'dead'));

  const retry = await fetch(`${base}/retry`, { method: 'POST', headers: KEY, body: JSON.stringify({ id: 'dead' }) });
  assert.equal(retry.status, 200);

  failures = await (await fetch(`${base}/failures`, { headers: KEY })).json();
  assert.equal(failures.some((e) => e.id === 'dead'), false, 'requeued entry no longer in failures');
});
