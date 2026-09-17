import { z } from 'zod';
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
