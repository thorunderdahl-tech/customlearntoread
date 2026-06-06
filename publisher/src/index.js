'use strict';

// Entry point: a tiny HTTP health server + the in-process cron scheduler.

const config = require('./config');
const logger = require('./logger');
const store = require('./store');
const { runDuePosts } = require('./scheduler');
const { createServer } = require('./api');

function startServer() {
  const server = createServer();
  server.listen(config.port, () => {
    logger.info(`API + health server listening on :${config.port}`);
    if (!config.apiKey) logger.warn('API_KEY not set — write endpoints are open. Set API_KEY in production.');
  });
  return server;
}

function startCron() {
  let cron;
  try {
    cron = require('node-cron');
  } catch {
    logger.warn('node-cron not installed — scheduler disabled. Run `npm install` to enable it.');
    return null;
  }
  const task = cron.schedule(config.cronSchedule, async () => {
    try {
      await runDuePosts();
    } catch (err) {
      logger.error('Scheduled run failed', err.message);
    }
  });
  logger.info(`Cron scheduled: "${config.cronSchedule}"`);
  return task;
}

async function main() {
  logger.info(`Starting Custom Learn to Read auto-publisher (dryRun=${config.dryRun})`);
  await store.init();
  startServer();
  startCron();
}

if (require.main === module) {
  main().catch((err) => {
    logger.error('Fatal startup error', err);
    process.exit(1);
  });
}

module.exports = { startServer, startCron, main };
