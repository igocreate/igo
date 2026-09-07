import type { Request, Response, NextFunction } from 'express';
import type { StandardSchemaV1 } from '@standard-schema/spec';

type Infer<S> = S extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<S> : never;

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
      Schemas['query']  extends StandardSchemaV1 ? Infer<Schemas['query']>  : Record<string, unknown>
    >,
    res: Response,
    next: NextFunction
  ): void | Promise<void>;

  body?:   Schemas['body'];
  query?:  Schemas['query'];
  params?: Schemas['params'];
}
