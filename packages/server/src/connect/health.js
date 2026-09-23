
const { statfs } = require('fs/promises');

const cache  = require('../cache');
const config = require('../config');
const db     = require('@igojs/db');
const logger = require('../logger');

const UP   = 'UP';
const DOWN = 'DOWN';

// Set at the first step of the shutdown, before the socket is closed, so a load
// balancer reading readiness takes the instance out while it can still serve.
let draining = false;

module.exports.drain = (value = true) => {
  draining = value;
};

// A probe that hangs must not hold the answer: an orchestrator that waits is an
// orchestrator that keeps routing traffic to an instance already in trouble.
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((resolve, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
]);

const probeDb = async () => {
  await db.dbs.main.query('SELECT 1', [], { silent: true });
};

// The cache module already tracks the connection: it reconnects on its own and
// reports a degraded state, so asking it is both cheaper and more accurate than
// a PING that would race with its reconnection.
const probeCache = async () => {
  if (!cache.isAvailable()) {
    throw new Error('redis is not available');
  }
};

// The disk the application writes to, not the root: on a host with separate
// partitions `/` stays healthy while the one holding the logs and the uploads
// fills up.
const probeDisk = async (threshold) => {
  const { bsize, bavail } = await statfs(config.projectRoot);
  const free = bsize * bavail;
  if (free < threshold) {
    throw new Error(`${free} bytes free, below ${threshold}`);
  }
};

// CPU and memory are deliberately absent: a saturated CPU is often an instance
// doing its job, and taking it out would spread the load onto the others. They
// belong to alerting, where a trend is read, not to a probe that decides in
// isolation.
const PROBES = {
  db:    probeDb,
  cache: probeCache,
  disk:  probeDisk,
};

const runProbe = async (name, setting, timeout) => {
  try {
    await withTimeout(PROBES[name](setting), timeout);
    return UP;
  } catch (err) {
    // The reason stays in the logs: /health/ready is reachable by whoever can
    // reach the service, and a connection error names hosts and ports.
    logger.warn('health: %s is down', name, { error: err.message });
    return DOWN;
  }
};

const send = (res, status, body) => {
  res.status(status).type('application/json').json(body);
};

const liveness = (req, res) => {
  send(res, 200, { status: UP });
};

// A dependency the application cannot serve without brings readiness down;
// one it merely runs better with is reported and nothing more. Sending 503
// because the cache is gone would take an instance that still serves out of
// the load balancer — a degradation turned into an outage.
const isOptional = (setting) => setting === 'optional';

const readiness = (settings) => async (req, res) => {
  if (draining) {
    return send(res, 503, { status: DOWN, components: {} });
  }

  const names = Object.keys(PROBES).filter(name => settings[name]);
  const states = await Promise.all(
    names.map(name => runProbe(name, settings[name], settings.timeout)));

  const components = {};
  names.forEach((name, i) => {
    components[name] = { status: states[i] };
  });

  const up = states.every((state, i) =>
    state === UP || isOptional(settings[names[i]]));
  // 503 and not 500: the service did not fail, it is not ready to serve. Load
  // balancers only read the status code, so this is what takes the instance out
  // of rotation.
  send(res, up ? 200 : 503, { status: up ? UP : DOWN, components });
};

// Mounted by igo before the request logger, which is what keeps these routes
// out of the request log: probed every few seconds, they would otherwise be
// most of it.
module.exports.init = (app) => {
  const settings = config.health;
  if (!settings) {
    return;
  }

  app.get(settings.path, liveness);
  app.get(`${settings.path}/ready`, readiness(settings));
};
