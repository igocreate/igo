// ESM wrapper for @igojs/signal
import signal from './index.js';

export const middleware = signal.middleware;
export const templates = signal.templates;
export const configure = signal.configure;
export const serialize = signal.serialize;
export const SignalComponent = signal.SignalComponent;

export default signal;
