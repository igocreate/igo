import type { Request, Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import type { StandardSchemaV1 } from '@standard-schema/spec';

type Infer<S> = S extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<S> : never;

/**
 * Express constrains its query type to ParsedQs, and takes the handlers of one
 * route in a rest parameter — so a single query type has to satisfy every
 * handler of the call. A plain middleware pins it to ParsedQs, and a handler
 * whose query was only the schema output then matched no overload: the error
 * TypeScript reported was the last one it tried, about ErrorRequestHandler and
 * chunkedEncoding, which said nothing of the cause.
 *
 * Hence the intersection below, which keeps a guard and a paginated handler on
 * the same route. It has a cost: ParsedQs carries an index signature, so
 * reading a field absent from the schema is no longer a compile error — only
 * its type is. Rewriting `query` on top of a conforming Request would keep that
 * check, but breaks the structural match Express needs, so no overload matches
 * again.
 */

/**
 * An API handler whose request is shaped by the schemas attached to it.
 *
 *   const create: ApiHandler<{ body: typeof CreateBook }> = (req, res) => {
 *     req.body.pages;            // number, coerced and validated
 *   };
 *   create.body = CreateBook;
 *
 * The schemas are read by igo at boot: declaring them here only mirrors, for
 * the type checker, what the runtime already does.
 */
export interface ApiHandler<
  Schemas extends {
    body?:   StandardSchemaV1;
    query?:  StandardSchemaV1;
    params?: StandardSchemaV1;
  } = {}
> {
  (
    req: Request<
      Schemas['params'] extends StandardSchemaV1 ? Infer<Schemas['params']> : Record<string, string>,
      unknown,
      Schemas['body']   extends StandardSchemaV1 ? Infer<Schemas['body']>   : unknown,
      Schemas['query']  extends StandardSchemaV1 ? Infer<Schemas['query']> & ParsedQs : ParsedQs
    >,
    res: Response,
    next: NextFunction
  ): void | Promise<void>;

  body?:   Schemas['body'];
  query?:  Schemas['query'];
  params?: Schemas['params'];
}
