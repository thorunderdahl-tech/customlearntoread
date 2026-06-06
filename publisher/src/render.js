'use strict';

// Renders a personalized 1080×1080 "book page" asset for a child + theme.
// Produces an SVG (zero-dependency, instant); if `sharp` is installed it also
// rasterizes to PNG and serves that, since Instagram/TikTok need raster, not SVG.

const logger = require('./logger');
const media = require('./media');

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function titleCase(str = '') {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildSvg({ childName, theme }) {
  const name = escapeXml(titleCase(childName || 'Your Child'));
  const themeText = escapeXml(titleCase((theme || '').replace(/[-_]/g, ' ')) || 'A Reading Adventure');
  // Warm, kid-friendly palette — deliberately not the generic AI look.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF3E4"/>
      <stop offset="1" stop-color="#F3E2C7"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect x="60" y="60" width="960" height="960" rx="48" fill="#FFFDF8" stroke="#E4B363" stroke-width="6"/>
  <text x="540" y="250" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" fill="#C1666B">Custom Learn to Read</text>
  <text x="540" y="500" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="150" font-weight="bold" fill="#3A405A">${name}</text>
  <text x="540" y="610" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-style="italic" fill="#5C6378">${themeText}</text>
  <g transform="translate(540 760)">
    <path d="M-180 0 C-120 -40 -40 -40 0 -10 C40 -40 120 -40 180 0 L180 90 C120 60 40 60 0 90 C-40 60 -120 60 -180 90 Z" fill="#E4B363" opacity="0.9"/>
    <line x1="0" y1="-10" x2="0" y2="90" stroke="#FFFDF8" stroke-width="5"/>
  </g>
  <text x="540" y="950" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#9A8C73">A book starring ${name} 📖</text>
</svg>`;
}

// Returns { url, mediaType, format, bytes }.
async function renderBookPage({ childName, theme }) {
  const svg = buildSvg({ childName, theme });
  const baseName = `${(childName || 'page').toString().toLowerCase().replace(/[^\w]+/g, '-')}-cover`;

  // Rasterize to PNG when sharp is available (publishable); else serve the SVG.
  try {
    const sharp = require('sharp'); // lazy/optional
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const saved = media.save(`${baseName}.png`, png, 'image/png');
    return { url: saved.url, mediaType: 'IMAGE', format: 'png', bytes: saved.bytes };
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;
    logger.info('sharp not installed — serving SVG (install sharp for a publishable PNG)');
    const saved = media.save(`${baseName}.svg`, Buffer.from(svg, 'utf8'), 'image/svg+xml');
    return { url: saved.url, mediaType: 'IMAGE', format: 'svg', bytes: saved.bytes };
  }
}

module.exports = { renderBookPage, buildSvg };
