import { method } from "../../config";

import { z } from "zod";

const rawRequest = z.object({
  path: z.string(),
  method: method,
  query: z.string().nullable(),
  body: z.any().nullable(),
});

export type RawRequest = z.infer<typeof rawRequest>;
