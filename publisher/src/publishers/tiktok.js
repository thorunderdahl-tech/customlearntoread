'use strict';

// TikTok publisher (Content Posting API, PULL_FROM_URL).
//
// Publish flow:
//   1. POST /v2/post/publish/video/init/  -> starts a publish, returns publish_id
//   2. poll /v2/post/publish/status/fetch/ until status is PUBLISH_COMPLETE  [Task 2]
//
// PULL_FROM_URL requires the media domain to be verified in the TikTok app.
// Unaudited apps can only post SELF_ONLY. In DRY_RUN we just log.

const config = require('../config');
const logger = require('../logger');

const API = 'https://open.tiktokapis.com/v2';

function truncate(str, n = 80) {
  if (!str) return '';
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

async function initPublish({ content, accessToken }) {
  const body = {
    post_info: {
      title: content.caption || '',
      privacy_level: 'SELF_ONLY', // safest default until the app is audited
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: content.mediaUrl,
    },
  };

  const res = await fetch(`${API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error?.code !== 'ok') {
    throw new Error(`TikTok init failed (${res.status}): ${JSON.stringify(json.error || json)}`);
  }
  return json.data.publish_id;
}

async function publish({ content }) {
  if (config.dryRun) {
    logger.info(`[DRY_RUN] tiktok <- ${content.id} (${content.mediaType})`);
    logger.info(`[DRY_RUN]   media:   ${content.mediaUrl}`);
    logger.info(`[DRY_RUN]   caption: ${truncate(content.caption)}`);
    return { dryRun: true, channel: 'tiktok', contentId: content.id };
  }

  const accessToken = config.tiktok.accessToken;
  if (!accessToken) {
    throw new Error('TikTok not configured: set TIKTOK_ACCESS_TOKEN');
  }

  const publishId = await initPublish({ content, accessToken });

  // TODO(Task 2): poll /v2/post/publish/status/fetch/ until PUBLISH_COMPLETE
  // (PULL_FROM_URL is async — init only queues the download).

  logger.info(`tiktok publish queued ${content.id} -> publish_id ${publishId}`);
  return { channel: 'tiktok', contentId: content.id, remoteId: publishId };
}

module.exports = { publish, initPublish };
