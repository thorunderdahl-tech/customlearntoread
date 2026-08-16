'use strict';

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-uploads-'));
process.env.UPLOADS_DIR = UPLOADS;
process.env.PUBLIC_BASE_URL = 'https://example.test';
delete process.env.ANTHROPIC_API_KEY; // force the stub path

const test = require('node:test');
const assert = require('node:assert');
const captions = require('../src/captions');
const media = require('../src/media');
const render = require('../src/render');

test('captions: stub returns requested count when no API key', async () => {
  const r = await captions.generateCaptions({ childName: 'Emma', theme: 'space', count: 3 });
  assert.equal(r.generated, false);
  assert.equal(r.model, 'stub');
  assert.equal(r.captions.length, 3);
  assert.ok(r.captions[0].includes('Emma'));
});

test('captions: count is clamped to 1..5', async () => {
  assert.equal((await captions.generateCaptions({ childName: 'A', count: 99 })).captions.length, 5);
  assert.equal((await captions.generateCaptions({ childName: 'A', count: -1 })).captions.length, 1);
  // Falsy/unspecified count falls back to the default of 3.
  assert.equal((await captions.generateCaptions({ childName: 'A', count: 0 })).captions.length, 3);
});

test('media: save then resolvePath round-trips the bytes', () => {
  const saved = media.save('pic.png', Buffer.from('hello'), 'image/png');
  assert.equal(saved.mediaType, 'IMAGE');
  assert.ok(saved.url.startsWith('https://example.test/media/'));
  assert.equal(fs.readFileSync(media.resolvePath(saved.filename), 'utf8'), 'hello');
});

test('media: mediaTypeFor maps video to VIDEO', () => {
  assert.equal(media.mediaTypeFor('video/mp4'), 'VIDEO');
  assert.equal(media.mediaTypeFor('image/png'), 'IMAGE');
});

test('media: resolvePath blocks traversal', () => {
  // basename strips the path, so this resolves inside the uploads dir, not /etc.
  const resolved = media.resolvePath('../../etc/passwd');
  assert.ok(resolved.startsWith(path.resolve(UPLOADS)));
});

test('render: produces an IMAGE asset with a public URL', async () => {
  const r = await render.renderBookPage({ childName: 'Odin', theme: 'pirate-tale' });
  assert.equal(r.mediaType, 'IMAGE');
  assert.ok(['svg', 'png'].includes(r.format));
  assert.ok(r.url.startsWith('https://example.test/media/'));
  assert.ok(fs.existsSync(media.resolvePath(r.url.split('/media/')[1])));
});

test('render: buildSvg escapes and title-cases the name', () => {
  const svg = render.buildSvg({ childName: 'a&b', theme: 'x' });
  assert.ok(svg.includes('A&amp;B'));
  assert.ok(!svg.includes('a&b'));
});
