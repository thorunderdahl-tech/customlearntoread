'use strict';

// Thin HTTP API so the browser Studio can write approved copy + schedule
// directly here, read the analytics feed, and manage failed posts.
//
// Routes (all JSON):
//   GET  /health             liveness + dryRun flag (no auth)
//   POST /run                process all currently-due entries now
//   GET  /calendar           list calendar entries
//   POST /calendar           upsert a calendar entry
//   GET  /content            list content (approved copy)
//   POST /content            upsert content
//   POST /studio/schedule    create content + a calendar entry in one call
//   GET  /insights           analytics feed for the Insights tab
//   GET  /failures           dead-lettered entries (status "failed")
//   POST /retry              requeue a dead-lettered entry  { id }
//
// If API_KEY is set it's required on every route except /health, sent as
// `X-API-Key: <key>` or `Authorization: Bearer <key>`.

const http = require('http');
const crypto = require('crypto');
const config = require('./config');
const logger = require('./logger');
const store = require('./store');
const analytics = require('./analytics');
const { runDuePosts } = require('./scheduler');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new HttpError(413, 'payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function authorized(req) {
  if (!config.apiKey) return true;
  const fromHeader = req.headers['x-api-key'];
  const fromBearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return fromHeader === config.apiKey || fromBearer === config.apiKey;
}

function normalizeContent(body) {
  if (!body || !body.mediaUrl || !body.mediaType) {
    throw new HttpError(400, 'content requires mediaUrl and mediaType');
  }
  return {
    id: body.id || `content-${crypto.randomUUID()}`,
    caption: body.caption || '',
    mediaUrl: body.mediaUrl,
    mediaType: body.mediaType,
  };
}

function normalizeEntry(body) {
  if (!body || !body.channel || !body.contentId || !body.publishAt) {
    throw new HttpError(400, 'entry requires channel, contentId and publishAt');
  }
  if (Number.isNaN(new Date(body.publishAt).getTime())) {
    throw new HttpError(400, 'publishAt must be an ISO date');
  }
  return {
    id: body.id || `post-${crypto.randomUUID()}`,
    channel: body.channel,
    contentId: body.contentId,
    publishAt: body.publishAt,
    status: body.status || 'scheduled',
    theme: body.theme || null,
  };
}

async function handle(req, res, send) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const { method } = req;

  if (method === 'GET' && pathname === '/health') {
    return send(200, { status: 'ok', dryRun: config.dryRun, time: new Date().toISOString() });
  }

  if (!authorized(req)) return send(401, { error: 'unauthorized' });

  if (method === 'POST' && pathname === '/run') {
    const results = await runDuePosts();
    return send(200, { ran: results.length, results });
  }

  if (method === 'GET' && pathname === '/calendar') {
    return send(200, await store.getCalendar());
  }
  if (method === 'POST' && pathname === '/calendar') {
    const entry = normalizeEntry(await readJsonBody(req));
    return send(200, await store.upsertEntry(entry));
  }

  if (method === 'GET' && pathname === '/content') {
    return send(200, [...(await store.getContentMap()).values()]);
  }
  if (method === 'POST' && pathname === '/content') {
    const content = normalizeContent(await readJsonBody(req));
    return send(200, await store.upsertContent(content));
  }

  // The Studio handoff: approve copy + schedule it in one request.
  if (method === 'POST' && pathname === '/studio/schedule') {
    const body = await readJsonBody(req);
    const content = normalizeContent(body.content || body);
    await store.upsertContent(content);
    const entry = normalizeEntry({
      ...body,
      contentId: content.id,
      channel: body.channel,
      publishAt: body.publishAt,
    });
    await store.upsertEntry(entry);
    return send(201, { content, entry });
  }

  if (method === 'GET' && pathname === '/insights') {
    return send(200, await analytics.getInsightsFeed());
  }

  if (method === 'GET' && pathname === '/failures') {
    const calendar = await store.getCalendar();
    return send(200, calendar.filter((e) => e.status === 'failed'));
  }
  if (method === 'POST' && pathname === '/retry') {
    const { id } = await readJsonBody(req);
    if (!id) throw new HttpError(400, 'retry requires an entry id');
    await store.updateEntryStatus(id, 'scheduled', { attempts: 0 });
    return send(200, { retried: id });
  }

  return send(404, { error: 'not found' });
}

function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    const send = (code, payload) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    try {
      await handle(req, res, send);
    } catch (err) {
      const code = err.statusCode || 500;
      if (code >= 500) logger.error('API error', err.message);
      send(code, { error: err.message });
    }
  });
}

module.exports = { createServer };
