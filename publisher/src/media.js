'use strict';

// Media hosting: stores uploaded/rendered assets on local disk and serves them
// back at a public URL (`${PUBLIC_BASE_URL}/media/<file>`), so Instagram/TikTok
// PULL_FROM_URL can fetch them. Swap UPLOADS_DIR for a mounted volume, or this
// module for an S3/R2 client, to move off local disk in production.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

function safeName(name) {
  return (path.basename(name || '').replace(/[^\w.\-]/g, '_')) || 'file';
}

function ensureDir() {
  if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });
}

function publicUrl(filename) {
  return `${config.publicBaseUrl}/media/${filename}`;
}

function contentTypeFor(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

// Map a MIME type to the calendar's mediaType. Images -> IMAGE; video defaults
// to VIDEO (the Studio can switch to REELS for Instagram).
function mediaTypeFor(contentType) {
  if (contentType && contentType.startsWith('video/')) return 'VIDEO';
  return 'IMAGE';
}

// Persist a buffer and return { filename, url, bytes, contentType, mediaType }.
function save(originalName, buffer, contentType) {
  ensureDir();
  const fromName = path.extname(safeName(originalName));
  const ext = fromName || EXT_BY_MIME[contentType] || '';
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(config.uploadsDir, filename), buffer);
  const type = contentType || contentTypeFor(filename);
  return {
    filename,
    url: publicUrl(filename),
    bytes: buffer.length,
    contentType: type,
    mediaType: mediaTypeFor(type),
  };
}

// Resolve a request path to an on-disk file, or null if it escapes the dir.
function resolvePath(filename) {
  const name = safeName(filename);
  const full = path.join(config.uploadsDir, name);
  if (!full.startsWith(path.resolve(config.uploadsDir))) return null;
  return full;
}

module.exports = { save, resolvePath, publicUrl, contentTypeFor, mediaTypeFor };
