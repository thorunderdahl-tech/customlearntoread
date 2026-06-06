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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Poll the publish status until it completes. status is one of:
// PROCESSING_UPLOAD | PROCESSING_DOWNLOAD | SEND_TO_USER_INBOX |
// PUBLISH_COMPLETE | FAILED. PUBLISH_COMPLETE is the terminal success for a
// direct PULL_FROM_URL post; FAILED carries a fail_reason.
async function pollPublishStatus({ publishId, accessToken }) {
  const { intervalMs, maxAttempts } = config.poll;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const json = await res.json();
    if (!res.ok || json.error?.code !== 'ok') {
      throw new Error(
        `TikTok status fetch failed (${res.status}): ${JSON.stringify(json.error || json)}`
      );
    }

    const { status, fail_reason: failReason, publicaly_available_post_id: postIds } = json.data;
    logger.info(`tiktok publish ${publishId} status=${status} (attempt ${attempt}/${maxAttempts})`);

    if (status === 'PUBLISH_COMPLETE') {
      return { status, postId: Array.isArray(postIds) ? postIds[0] : undefined };
    }
    if (status === 'FAILED') {
      throw new Error(`TikTok publish ${publishId} FAILED: ${failReason || 'unknown reason'}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `TikTok publish ${publishId} not complete after ${maxAttempts} attempts ` +
      `(~${(maxAttempts * intervalMs) / 1000}s)`
  );
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

  // PULL_FROM_URL is async — init only queues the download. Wait for the post
  // to actually complete before we report success.
  const { postId } = await pollPublishStatus({ publishId, accessToken });

  logger.info(`tiktok published ${content.id} -> publish_id ${publishId}${postId ? ` (post ${postId})` : ''}`);
  return { channel: 'tiktok', contentId: content.id, remoteId: publishId, postId };
}

module.exports = { publish, initPublish, pollPublishStatus };
