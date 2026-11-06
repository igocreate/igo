import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { ApiHandler } from '../../index';

const CreateBook = z.object({ title: z.string(), pages: z.number() });

// Each line below must be rejected by tsc: typesTest.js asserts on the codes.
export const create: ApiHandler<{ body: typeof CreateBook }> = (req, res) => {
  // @ts-expect-error pages is a number, not a string
  const wrongType: string = req.body.pages;
  // @ts-expect-error subtitle is not part of the schema
  const missing = req.body.subtitle;
  // @ts-expect-error title is a string, not a number
  req.body.title = 42;
  res.json({ wrongType, missing });
};
create.body = CreateBook;

export const session: RequestHandler = (req, res) => {
  if (req.session) {
    // @ts-expect-error userId is a number, declared by valid.ts
    req.session.userId = 'abc';
  }
  // @ts-expect-error a session is an object or null
  req.session = 42;
  // @ts-expect-error restart() takes no callback
  req.session?.restart(() => {});
  res.end();
};
