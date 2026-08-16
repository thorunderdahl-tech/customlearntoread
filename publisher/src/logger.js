'use strict';

function emit(level, msg, extra) {
  const line = `[${new Date().toISOString()}] ${level} ${msg}`;
  if (extra !== undefined) console.log(line, extra);
  else console.log(line);
}

module.exports = {
  info: (msg, extra) => emit('INFO ', msg, extra),
  warn: (msg, extra) => emit('WARN ', msg, extra),
  error: (msg, extra) => emit('ERROR', msg, extra),
};
