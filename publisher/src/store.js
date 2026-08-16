'use strict';

// Storage selector. Uses Postgres when DATABASE_URL is set, otherwise JSON files.
// Both backends implement the same async API, so callers never change:
//   init, getCalendar, getContentMap, getContent,
//   updateEntryStatus, appendLog, getTokens, saveTokens
//
// store.postgres is only required when DATABASE_URL is set, so `pg` stays
// optional for local/dry-run use.

const config = require('./config');

const backend = config.databaseUrl ? require('./store.postgres') : require('./store.json');

module.exports = backend;
