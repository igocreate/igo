import type { Request } from 'express';

/**
 * Whether a request is served as JSON — under `config.api.prefix`, or from a
 * client whose Accept header asks for it.
 */
export declare function isApiRequest(req: Pick<Request, 'path' | 'headers'>): boolean;
