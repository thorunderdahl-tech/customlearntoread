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

  const accessToken = config.instagram.accessToken;
  if (!accessToken || !config.instagram.userId) {
    throw new Error('Instagram not configured: set IG_USER_ID and IG_ACCESS_TOKEN');
  }

  const containerId = await createContainer({ content, accessToken });

  // TODO(Task 1): for video/REELS, poll container status_code until FINISHED
  // before publishing, otherwise media_publish can fail with "media not ready".

  const mediaId = await publishContainer({ containerId, accessToken });
  logger.info(`instagram published ${content.id} -> media ${mediaId}`);
  return { channel: 'instagram', contentId: content.id, containerId, remoteId: mediaId };
}

module.exports = { publish, createContainer, publishContainer };
