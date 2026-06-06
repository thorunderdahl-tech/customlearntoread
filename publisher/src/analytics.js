'use strict';

// Pull-back metrics stubs. Endpoint shapes are correct; gated by DRY_RUN.
// Checklist: wire these results into a feed the Studio's Insights tab can read.

const config = require('./config');
const logger = require('./logger');
const store = require('./store');

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

// Build the feed the Studio's Insights tab reads: metrics for every posted
// entry, keyed back to its calendar entry. Per-item errors are captured inline
// so one bad fetch doesn't sink the whole feed.
async function getInsightsFeed() {
  const calendar = await store.getCalendar();
  const posted = calendar.filter((e) => e.status === 'posted' && e.remoteId);

  const items = [];
  for (const e of posted) {
    let metrics;
    try {
      metrics =
        e.channel === 'instagram'
          ? await getInstagramInsights(e.remoteId)
          : await getTikTokVideoMetrics(e.remoteId);
    } catch (err) {
      metrics = { error: err.message };
    }
    items.push({
      entryId: e.id,
      channel: e.channel,
      contentId: e.contentId,
      theme: e.theme,
      remoteId: e.remoteId,
      postedAt: e.postedAt,
      metrics,
    });
  }

  return { generatedAt: new Date().toISOString(), dryRun: config.dryRun, count: items.length, items };
}

module.exports = { getInsightsFeed, getInstagramInsights, getTikTokVideoMetrics };
