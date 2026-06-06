'use strict';

// Pull-back metrics stubs. Endpoint shapes are correct; gated by DRY_RUN.
// Checklist: wire these results into a feed the Studio's Insights tab can read.

const config = require('./config');
const logger = require('./logger');

async function getInstagramInsights(mediaId, accessToken = config.instagram.accessToken) {
  if (config.dryRun) {
    logger.info(`[DRY_RUN] would fetch IG insights for media ${mediaId}`);
    return { dryRun: true, mediaId };
  }
  const metrics = 'impressions,reach,likes,comments,saved,shares';
  const url =
    `https://graph.facebook.com/${config.instagram.graphVersion}/${mediaId}/insights` +
    `?metric=${metrics}&access_token=${accessToken}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(`IG insights failed (${res.status}): ${JSON.stringify(json)}`);
  return json.data;
}

async function getTikTokVideoMetrics(videoId, accessToken = config.tiktok.accessToken) {
  if (config.dryRun) {
    logger.info(`[DRY_RUN] would fetch TikTok metrics for video ${videoId}`);
    return { dryRun: true, videoId };
  }
  const res = await fetch('https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`TikTok metrics failed (${res.status}): ${JSON.stringify(json)}`);
  return json.data;
}

module.exports = { getInstagramInsights, getTikTokVideoMetrics };
