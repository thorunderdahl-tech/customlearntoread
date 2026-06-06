'use strict';

// Finds calendar entries that are due (status "scheduled" and publishAt <= now)
// and dispatches each to the right publisher.

const config = require('./config');
const logger = require('./logger');
const store = require('./store');
const { getPublisher } = require('./publishers');

function isDue(entry, now) {
  return entry.status === 'scheduled' && new Date(entry.publishAt).getTime() <= now;
}

async function dispatch(entry) {
  const content = await store.getContent(entry.contentId);
  if (!content) {
    const error = `No content found for contentId "${entry.contentId}"`;
    logger.error(`Entry ${entry.id}: ${error}`);
    await store.updateEntryStatus(entry.id, 'failed', { error });
    await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'failed', error });
    return { entry, status: 'failed', error };
  }

  try {
    const publisher = getPublisher(entry.channel);
    const result = await publisher.publish({ content, entry });

    if (config.dryRun) {
      // Guardrail: in dry-run, posts stay "scheduled" so they can be re-tested.
      await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'dry-run', detail: result });
      logger.info(`Entry ${entry.id} [${entry.channel}] -> dry-run (left scheduled)`);
      return { entry, status: 'dry-run', result };
    }

    await store.updateEntryStatus(entry.id, 'posted', {
      postedAt: new Date().toISOString(),
      remoteId: result.remoteId,
    });
    await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'posted', detail: result });
    logger.info(`Entry ${entry.id} [${entry.channel}] -> posted (${result.remoteId})`);
    return { entry, status: 'posted', result };
  } catch (err) {
    logger.error(`Entry ${entry.id} [${entry.channel}] failed: ${err.message}`);
    await store.updateEntryStatus(entry.id, 'failed', { error: err.message });
    await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'failed', error: err.message });
    return { entry, status: 'failed', error: err.message };
  }
}

async function runDuePosts({ now = Date.now() } = {}) {
  await store.init();
  const calendar = await store.getCalendar();
  const due = calendar.filter((e) => isDue(e, now));
  logger.info(
    `Scheduler tick: ${due.length} due of ${calendar.length} entries (dryRun=${config.dryRun})`
  );

  const results = [];
  for (const entry of due) {
    results.push(await dispatch(entry));
  }
  return results;
}

module.exports = { runDuePosts, dispatch, isDue };
