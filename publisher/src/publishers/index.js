'use strict';

// Router: maps a calendar entry's `channel` to its publisher module.

const instagram = require('./instagram');
const tiktok = require('./tiktok');

const publishers = { instagram, tiktok };

function getPublisher(channel) {
  const publisher = publishers[channel];
  if (!publisher) {
    throw new Error(`No publisher registered for channel "${channel}"`);
  }
  return publisher;
}

module.exports = { getPublisher, publishers };
