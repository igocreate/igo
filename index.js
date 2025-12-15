
// Meta-package igo - exports all sub-packages
const server = require('@igojs/server');
const db = require('@igojs/db');
const signal = require('@igojs/signal');

// Re-export everything from @igojs/server for backward compatibility
const igo = {
  ...server,
  // Also expose db module directly
  db,
  // Expose signal module
  signal,
};

module.exports = igo;
