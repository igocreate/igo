import type { Request, Response } from 'express';

/** RFC 9457 Problem Details document. */
export interface ProblemDocument {
  type:    string;
  title:   string;
  status:  number;
  detail?: string;
  errors?: ProblemError[];
}

export interface ProblemError {
  path:    string;
  message: string;
}

export interface ProblemOptions {
  type?:   string;
  title?:  string;
  detail?: string;
  errors?: ProblemError[];
}

export declare const CONTENT_TYPE: 'application/problem+json';

/** True when the request targets the API prefix, or asks for JSON. */
export declare function isApiRequest(req: Pick<Request, 'path' | 'headers'>): boolean;

export declare function problem(status: number, options?: ProblemOptions): ProblemDocument;

export declare function send(res: Response, status: number, options?: ProblemOptions): Response;
