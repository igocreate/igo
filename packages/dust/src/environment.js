

// see https://github.com/flexdinesh/browser-or-node/blob/master/src/index.js

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/* eslint-disable no-restricted-globals */
const isWebWorker = typeof self === 'object'
  && self.constructor
  && self.constructor.name === 'DedicatedWorkerGlobalScope';
/* eslint-enable no-restricted-globals */

const isNode = typeof process !== 'undefined'
  && process.versions != null
  && process.versions.node != null;

/**
 * @see https://github.com/jsdom/jsdom/releases/tag/12.0.0
 * @see https://github.com/jsdom/jsdom/issues/1537
 */
/* eslint-disable no-undef */
const isJsDom = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return (typeof window !== 'undefined' && window.name === 'nodejs')
    || navigator.userAgent.includes('Node.js')
    || navigator.userAgent.includes('jsdom');
};

module.exports = exports = {
  isBrowser, isWebWorker, isNode, isJsDom
};