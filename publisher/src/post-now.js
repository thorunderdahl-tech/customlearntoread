'use strict';

// One-shot: process every currently-due calendar entry, then exit.
// Works immediately with no credentials thanks to DRY_RUN.

const logger = require('./logger');
const { runDuePosts } = require('./scheduler');

(async () => {
  const results = await runDuePosts();
  logger.info(`post-now complete: ${results.length} ${results.length === 1 ? 'entry' : 'entries'} processed`);
  for (const r of results) {
    logger.info(`  - ${r.entry.id} [${r.entry.channel}] -> ${r.status}`);
  }
  process.exit(0);
})().catch((err) => {
  logger.error('post-now failed', err);
  process.exit(1);
});
