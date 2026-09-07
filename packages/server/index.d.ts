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
  }
}

export interface ApiConfig {
  prefix: string;
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
  databases:      string[];
  cookieSecret:   string;
  cookieSession:  CookieSessionConfig;
  mailcrashto?:   string | string[];
  /** false keeps the server alive after an uncaught exception a request already answered. */
  exitOnUncaughtException: boolean;
  loglevel:       string;
  /** 'json' for log collectors, 'human' for a terminal. */
  logformat:      'json' | 'human';
  /** false silences the one-line-per-request log. */
  logrequests:    boolean;
  [key: string]: unknown;
}

export declare const app: Express & {
  configure(): Promise<void>;
  run(configured?: () => void, started?: () => void): Promise<void>;
};

export declare const config: Config;

export declare function problem(status: number, options?: ProblemOptions): ProblemDocument;
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
