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
  /** Dotted path of the offending field, e.g. 'tags.0'. */
  path:    string;
  /** Stable identifier to branch on, e.g. 'invalid_type'. Absent if the schema library does not provide one. */
  code?:   string;
  /** Human-readable text; wording changes with the schema library. */
  message: string;
}

export interface ProblemOptions {
  type?:   string;
  title?:  string;
  detail?: string;
  errors?: ProblemError[];
}

export declare const CONTENT_TYPE: 'application/problem+json';

/** `type` of the problem igo returns when a schema rejects a request. */
export declare const VALIDATION_FAILED: 'urn:igo:validation-failed';

/** True when the request targets the API prefix, or asks for JSON. */
export declare function isApiRequest(req: Pick<Request, 'path' | 'headers'>): boolean;

export declare function problem(status: number, options?: ProblemOptions): ProblemDocument;

export declare function send(res: Response, status: number, options?: ProblemOptions): Response;
