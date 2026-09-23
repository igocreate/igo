import type { Express, RequestHandler, Router } from 'express';

import type { ProblemDocument, ProblemOptions } from './src/api/problem';

export type { ApiHandler } from './src/api/handler';
export type { ProblemDocument, ProblemError, ProblemOptions } from './src/api/problem';

declare global {
  namespace Express {
    interface Application {
      /**
       * Mounts an API router under `config.api.prefix` ('/api' by default).
       *
       *   app.api('/books', require('./api/books/books.routes'));  // -> /api/books
       *
       * Routers mounted this way answer in JSON on every error, and their
       * handlers' schemas are applied automatically.
       */
      api(path: string, ...handlers: Array<RequestHandler | Router>): Application;
    }
    interface Request {
      /** Trace id of the request: the active span's when instrumented, an inbound traceparent's, or one igo generated. */
      traceId: string;
    }
  }
}

export interface ApiConfig {
  prefix: string;
}

/** A header set to `false` or `null` is not sent. */
export interface SecurityConfig {
  noSniff:           boolean;
  frameOptions:      string | false;
  referrerPolicy:    string | false;
  permissionsPolicy: string | false;
  /** Sent in production only, over HTTPS. */
  hsts:              string | false;
  /** Content-Security-Policy of the pages; null by default, a working one is the project's. */
  csp:               string | null | false;
  /** Content-Security-Policy of the API responses. */
  apiCsp:            string | false;
  /** Cache-Control of the API responses. */
  apiCacheControl:   string | false;
}

export interface HealthConfig {
  /** Liveness is served here, readiness on `<path>/ready`. */
  path:    string;
  /**
   * Probe the main database with SELECT 1. 'optional' reports the probe
   * without ever bringing readiness down; false drops it.
   */
  db:      boolean | 'optional';
  /**
   * Probe the cache. 'optional' by default: igo serves without it, so a
   * missing cache must not take the instance out of a load balancer.
   */
  cache:   boolean | 'optional';
  /**
   * Free bytes on the project's filesystem below which readiness fails;
   * false drops the probe.
   */
  disk:    number | false | 'optional';
  /** Milliseconds a probe may take before it counts as down. */
  timeout: number;
}

export interface CookieSessionConfig {
  name:      string;
  keys:      string[];
  maxAge:    number;
  sameSite?: 'Lax' | 'Strict' | 'None' | boolean;
  [key: string]: unknown;
}

export interface Config {
  env:            string;
  httpport:       number | string;
  projectRoot:    string;
  api:            ApiConfig;
  /** Security headers on every response; `false` sends none. */
  security:       SecurityConfig | false;
  /** Liveness and readiness routes; `false` drops both. */
  health:         HealthConfig | false;
  databases:      string[];
  /** Names the app in crash emails; defaults to the project package name. */
  appname:        string;
  /** `service` of every JSON log line: OTEL_SERVICE_NAME, else the project package name. */
  servicename:    string;
  /** Deployment name (`qualif`, `production`…) in logs: ENVIRONMENT, else NODE_ENV. */
  environment:    string;
  /** Defaults to the project package version. */
  version:        string;
  cookieSecret:   string;
  cookieSession:  CookieSessionConfig;
  mailcrashto?:   string | string[];
  /** false keeps the server alive after an uncaught exception a request already answered. */
  exitOnUncaughtException: boolean;
  /**
   * Milliseconds between readiness answering 503 and the HTTP server closing,
   * so a load balancer takes the instance out before it stops accepting
   * connections. 0 by default; behind a load balancer, set it above its check
   * interval.
   */
  shutdownDelay:  number;
  /** Ceiling on the whole shutdown, after which the process exits anyway. */
  shutdownTimeout: number;
  /**
   * Invoked once the HTTP server is closed and before the database and the
   * cache are released — drain your own pools and flush your exporters here.
   * A rejection is logged and the shutdown carries on.
   */
  onShutdown?:    (() => void | Promise<void>) | null;
  loglevel:       string;
  /** 'json' for log collectors, 'human' for a terminal. */
  logformat:      'json' | 'human';
  /**
   * true logs every request, false none. A number is a status floor: 400 keeps
   * the errors and drops the successes. Read from LOG_REQUESTS.
   */
  logrequests:    boolean | number;
  /**
   * Keys whose value redact() replaces. null keeps igo's default pattern,
   * which covers the usual English and French names. A pattern set here
   * replaces the default rather than adding to it — extend
   * redact.DEFAULT_SENSITIVE_KEYS to keep both.
   */
  sensitiveKeys:  RegExp | null;
  [key: string]: unknown;
}

export declare const app: Express & {
  configure(): Promise<void>;
  run(configured?: () => void, started?: () => void): Promise<void>;
  /**
   * Closes the HTTP server, then config.onShutdown, then the databases and the
   * cache. run() binds it to SIGTERM and SIGINT; call it directly from a script
   * or a cron, which has no signal to wait for. Never rejects.
   */
  shutdown(): Promise<void>;
  /** Set by run() once the server is listening. */
  server?: import('http').Server;
};

export declare const config: Config;

export declare function problem(status: number, options?: ProblemOptions): ProblemDocument;

/**
 * Returns a copy of `value` with every sensitive field replaced by
 * '[redacted]', following config.sensitiveKeys. Use it before logging a
 * request body, its query or its headers.
 */
export declare function redact<T>(value: T): T;
export declare namespace redact {
  const DEFAULT_SENSITIVE_KEYS: RegExp;
}
export declare function sendProblem(res: import('express').Response, status: number, options?: ProblemOptions): import('express').Response;

export interface TestResponse {
  statusCode:   number;
  body:         string;
  headers:      Record<string, string>;
  redirectUrl?: string;
  /** The response body parsed as JSON, or undefined when it is not JSON. */
  readonly data: any;
}

export interface TestRequestOptions {
  body?:     unknown;
  query?:    Record<string, unknown>;
  params?:   Record<string, string>;
  headers?:  Record<string, string>;
  cookies?:  Record<string, string>;
  session?:  Record<string, unknown>;
  hostname?: string;
}

export declare const dev: {
  test(): void;
  agent: {
    send(url: string, options?: TestRequestOptions & { method?: string }): Promise<TestResponse>;
    get(url: string, options?: TestRequestOptions): Promise<TestResponse>;
    post(url: string, options?: TestRequestOptions): Promise<TestResponse>;
    put(url: string, options?: TestRequestOptions): Promise<TestResponse>;
    patch(url: string, options?: TestRequestOptions): Promise<TestResponse>;
    delete(url: string, options?: TestRequestOptions): Promise<TestResponse>;
  };
  webpackConfig: unknown;
};

export declare const cache: {
  get(namespace: string, key: string): Promise<unknown>;
  put(namespace: string, key: string, value: unknown, ttl?: number): Promise<void>;
  del(namespace: string, key: string): Promise<void>;
  fetch<T>(namespace: string, key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
  incr(namespace: string, key: string): Promise<number>;
  flushall(): Promise<void>;
};

export declare const logger: {
  error(message: unknown, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  log(level: string, message: string, meta?: Record<string, unknown>): void;
};

export declare const mailer: {
  send(template: string, options: Record<string, unknown>): Promise<unknown>;
};

export { default as express } from 'express';
export declare const i18next: typeof import('i18next').default;
export declare const Form: any;
