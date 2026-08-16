'use strict';

// Instagram publisher (Meta Graph API, Content Publishing).
//
// Publish flow:
//   1. POST /{ig-user-id}/media        -> creates a media container, returns its id
//   2. (video/REELS) poll the container's status_code until FINISHED   [Task 1]
//   3. POST /{ig-user-id}/media_publish -> publishes the container, returns media id
//
// In DRY_RUN we log the intended call and return without touching the network.

const config = require('../config');
const logger = require('../logger');
const auth = require('../auth');

const graphUrl = (segment) =>
  `https://graph.facebook.com/${config.instagram.graphVersion}/${segment}`;

function truncate(str, n = 80) {
  if (!str) return '';
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

async function createContainer({ content, accessToken }) {
  const params = new URLSearchParams({
    access_token: accessToken,
    caption: content.caption || '',
  });
  if (content.mediaType === 'IMAGE') {
    params.set('image_url', content.mediaUrl);
  } else {
    // REELS / VIDEO both use video_url; media_type tells IG how to treat it.
    params.set('media_type', content.mediaType);
    params.set('video_url', content.mediaUrl);
  }

  const res = await fetch(graphUrl(`${config.instagram.userId}/media`), {
    method: 'POST',
    body: params,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`IG createContainer failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.id; // container id
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Poll a container until it finishes processing. status_code is one of:
// IN_PROGRESS | FINISHED | ERROR | EXPIRED | PUBLISHED. Only FINISHED is
// safe to publish; ERROR/EXPIRED are terminal failures.
async function pollContainerStatus({ containerId, accessToken }) {
  const { intervalMs, maxAttempts } = config.poll;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = graphUrl(`${containerId}?fields=status_code,status&access_token=${accessToken}`);
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`IG container status check failed (${res.status}): ${JSON.stringify(json)}`);
    }

    const code = json.status_code;
    logger.info(`instagram container ${containerId} status=${code} (attempt ${attempt}/${maxAttempts})`);

    if (code === 'FINISHED' || code === 'PUBLISHED') return code;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`IG container ${containerId} ${code}: ${json.status || 'no detail'}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `IG container ${containerId} not ready after ${maxAttempts} attempts ` +
      `(~${(maxAttempts * intervalMs) / 1000}s)`
  );
}

async function publishContainer({ containerId, accessToken }) {
  const params = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });
  const res = await fetch(graphUrl(`${config.instagram.userId}/media_publish`), {
    method: 'POST',
    body: params,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`IG media_publish failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.id; // published media id
}

async function publish({ content }) {
  if (config.dryRun) {
    logger.info(`[DRY_RUN] instagram <- ${content.id} (${content.mediaType})`);
    logger.info(`[DRY_RUN]   media:   ${content.mediaUrl}`);
    logger.info(`[DRY_RUN]   caption: ${truncate(content.caption)}`);
    return { dryRun: true, channel: 'instagram', contentId: content.id };
  }

  if (!config.instagram.userId) {
    throw new Error('Instagram not configured: set IG_USER_ID');
  }
  const accessToken = await auth.getValidToken('instagram');

  const containerId = await createContainer({ content, accessToken });

  // Video/REELS containers process asynchronously; publishing before the
  // container is FINISHED fails with "media not ready". Images are ready
  // immediately, so skip the poll for them.
  if (content.mediaType !== 'IMAGE') {
    await pollContainerStatus({ containerId, accessToken });
  }

  const mediaId = await publishContainer({ containerId, accessToken });
  logger.info(`instagram published ${content.id} -> media ${mediaId}`);
  return { channel: 'instagram', contentId: content.id, containerId, remoteId: mediaId };
}

module.exports = { publish, createContainer, pollContainerStatus, publishContainer };
