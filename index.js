
// Meta-package igo - exports all sub-packages
const server = require('@igo/server');
const db = require('@igo/db');
const signal = require('@igo/signal');

// Re-export everything from @igo/server for backward compatibility
const igo = {
  ...server,
  // Also expose db module directly
  db,
  // Expose signal module
  signal,
};

module.exports = igo;
