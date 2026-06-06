'use strict';

// Create the Postgres schema and seed it from data/calendar.json + data/content.json.
// Run once after provisioning the database:  npm run migrate

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

function readJson(name) {
  const p = path.join(config.dataDir, name);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

(async () => {
  if (!config.databaseUrl) {
    logger.error('DATABASE_URL is not set — nothing to migrate. Set it to a Postgres URL first.');
    process.exit(1);
  }

  const pg = require('./store.postgres');
  logger.info('Creating schema (if needed)…');
  await pg.init();

  const content = readJson('content.json');
  const calendar = readJson('calendar.json');
  const result = await pg.seed({ content, calendar });

  logger.info(`Seed complete: ${result.content} content rows, ${result.calendar} calendar rows (existing entries left untouched).`);
  await pg.close();
  process.exit(0);
})().catch((err) => {
  logger.error('Migration failed', err);
  process.exit(1);
});
