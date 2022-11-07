export function init(): Promise<void>;
export function put(namespace: any, id: any, value: any, timeout: any): Promise<any>;
export function get(namespace: any, id: any): Promise<any>;
export function fetch(namespace: any, id: any, func: any, timeout: any): Promise<any>;
export function info(): Promise<any>;
export function incr(namespace: any, id: any): Promise<void>;
export function del(namespace: any, id: any): Promise<any>;
export function flushdb(): Promise<void>;
export function flushall(): Promise<void>;
export function scan(pattern: any, fn: any): Promise<void>;
export function flush(pattern: any): void;
//# sourceMappingURL=cache.d.ts.map