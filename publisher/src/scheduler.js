'use strict';

// Finds calendar entries that are due (status "scheduled" and publishAt <= now)
// and dispatches each to the right publisher.

const config = require('./config');
const logger = require('./logger');
const store = require('./store');
const { getPublisher } = require('./publishers');

function isDue(entry, now) {
  if (entry.status !== 'scheduled') return false;
  if (new Date(entry.publishAt).getTime() > now) return false;
  // Respect backoff: don't retry before nextAttemptAt.
  if (entry.nextAttemptAt && new Date(entry.nextAttemptAt).getTime() > now) return false;
  return true;
}

function backoffMs(attempt) {
  const { baseMs, maxMs } = config.retry;
  return Math.min(maxMs, baseMs * 2 ** (attempt - 1));
}

async function dispatch(entry) {
  const content = await store.getContent(entry.contentId);
  if (!content) {
    return handleFailure(entry, `No content found for contentId "${entry.contentId}"`);
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
      attempts: 0, // reset so a re-used id starts fresh
    });
    await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'posted', detail: result });
    logger.info(`Entry ${entry.id} [${entry.channel}] -> posted (${result.remoteId})`);
    return { entry, status: 'posted', result };
  } catch (err) {
    return handleFailure(entry, err.message);
  }
}

// Reschedule with exponential backoff, or dead-letter once attempts are exhausted.
async function handleFailure(entry, error) {
  const attempts = (entry.attempts || 0) + 1;

  if (attempts < config.retry.maxAttempts) {
    const nextAttemptAt = new Date(Date.now() + backoffMs(attempts)).toISOString();
    await store.updateEntryStatus(entry.id, 'scheduled', { attempts, nextAttemptAt, error });
    await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'retry-scheduled', error, detail: { attempts, nextAttemptAt } });
    logger.warn(`Entry ${entry.id} [${entry.channel}] failed (attempt ${attempts}/${config.retry.maxAttempts}); retry at ${nextAttemptAt}: ${error}`);
    return { entry, status: 'retry-scheduled', attempts, nextAttemptAt, error };
  }

  await store.updateEntryStatus(entry.id, 'failed', { attempts, error });
  await store.appendLog({ entryId: entry.id, channel: entry.channel, status: 'dead-letter', error, detail: { attempts } });
  logger.error(`Entry ${entry.id} [${entry.channel}] dead-lettered after ${attempts} attempts: ${error}`);
  return { entry, status: 'failed', attempts, error };
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

module.exports = { runDuePosts, dispatch, isDue, backoffMs };
