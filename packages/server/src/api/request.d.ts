import type { Request } from 'express';

/**
 * Whether a request targets an API route — a path under `config.api.prefix`.
 * Decides which middlewares run; the Accept header is never looked at.
 */
export declare function isApiRoute(req: Pick<Request, 'path'>): boolean;

/**
 * Whether an error response should be sent as JSON — on an API route, or when
 * the client's Accept header prefers JSON over HTML (q= weights included).
 */
export declare function wantsJson(req: Pick<Request, 'path' | 'headers'>): boolean;
