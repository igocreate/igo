/// <reference types="node" />

import { Model } from './src/db/Model';
import { config } from './src/config';
import { FForm } from './src/forms/Form';
export { ISchema } from './src/db/Schema'
export const Model: Model;
export const cache: typeof import("./src/cache");
export const CacheStats: typeof import("./src/db/CacheStats");
export const config: config;
export const dbs: typeof import("./src/db/dbs");
export const express: typeof import("express");
export const i18next: any;
export const IgoDust: any;
export const mailer: typeof import("./src/mailer");
export const migrations: typeof import("./src/db/migrations");
export const Form: typeof FForm
export const app: {
    (req: import("http").IncomingMessage | import("express-serve-static-core").Request<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string, any>>, res: import("http").ServerResponse<import("http").IncomingMessage> | import("express-serve-static-core").Response<any, Record<string, any>, number>): any;
    (req: import("express-serve-static-core").Request<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string, any>>, res: import("express-serve-static-core").Response<any, Record<string, any>, number>, next: import("express-serve-static-core").NextFunction): void;
    request: import("express-serve-static-core").Request<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string, any>>;
    response: import("express-serve-static-core").Response<any, Record<string, any>, number>;
    init(): void;
    defaultConfiguration(): void;
    engine(ext: string, fn: (path: string, options: object, callback: (e: any, rendered?: string) => void) => void): import("express-serve-static-core").Express;
    set(setting: string, val: any): import("express-serve-static-core").Express;
    get: ((name: string) => any) & import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    param(name: string | string[], handler: import("express-serve-static-core").RequestParamHandler): import("express-serve-static-core").Express;
    param(callback: (name: string, matcher: RegExp) => import("express-serve-static-core").RequestParamHandler): import("express-serve-static-core").Express;
    path(): string;
    enabled(setting: string): boolean;
    disabled(setting: string): boolean;
    enable(setting: string): import("express-serve-static-core").Express;
    disable(setting: string): import("express-serve-static-core").Express;
    render(name: string, options?: object, callback?: (err: Error, html: string) => void): void;
    render(name: string, callback: (err: Error, html: string) => void): void;
    listen(port: number, hostname: string, backlog: number, callback?: () => void): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    listen(port: number, hostname: string, callback?: () => void): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    listen(port: number, callback?: () => void): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    listen(callback?: () => void): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    listen(path: string, callback?: () => void): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    listen(handle: any, listeningListener?: () => void): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    router: string;
    settings: any;
    resource: any;
    map: any;
    locals: Record<string, any>;
    routes: any;
    _router: any;
    use: import("express-serve-static-core").ApplicationRequestHandler<import("express-serve-static-core").Express>;
    on: (event: string, callback: (parent: import("express-serve-static-core").Application<Record<string, any>>) => void) => import("express-serve-static-core").Express;
    mountpath: string | string[];
    addListener(eventName: string | symbol, listener: (...args: any[]) => void): import("express-serve-static-core").Express;
    once(eventName: string | symbol, listener: (...args: any[]) => void): import("express-serve-static-core").Express;
    removeListener(eventName: string | symbol, listener: (...args: any[]) => void): import("express-serve-static-core").Express;
    off(eventName: string | symbol, listener: (...args: any[]) => void): import("express-serve-static-core").Express;
    removeAllListeners(event?: string | symbol): import("express-serve-static-core").Express;
    setMaxListeners(n: number): import("express-serve-static-core").Express;
    getMaxListeners(): number;
    listeners(eventName: string | symbol): Function[];
    rawListeners(eventName: string | symbol): Function[];
    emit(eventName: string | symbol, ...args: any[]): boolean;
    listenerCount(eventName: string | symbol): number;
    prependListener(eventName: string | symbol, listener: (...args: any[]) => void): import("express-serve-static-core").Express;
    prependOnceListener(eventName: string | symbol, listener: (...args: any[]) => void): import("express-serve-static-core").Express;
    eventNames(): (string | symbol)[];
    all: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "all">;
    post: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "post">;
    put: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "put">;
    delete: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "delete">;
    patch: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "patch">;
    options: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "options">;
    head: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, "head">;
    checkout: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    connect: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    copy: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    lock: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    merge: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    mkactivity: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    mkcol: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    move: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    'm-search': import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    notify: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    propfind: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    proppatch: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    purge: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    report: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    search: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    subscribe: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    trace: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    unlock: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    unsubscribe: import("express-serve-static-core").IRouterMatcher<import("express-serve-static-core").Express, any>;
    route<T extends string>(prefix: T): import("express-serve-static-core").IRoute<T>;
    route(prefix: import("express-serve-static-core").PathParams): import("express-serve-static-core").IRoute<string>;
    stack: any[];
    configure: () => void;
    run: (configured: any, started: any) => void;
};