import { z } from "zod";

export const method = z.enum(["GET", "POST", "PUT", "DELETE"]);

export type Method = z.infer<typeof method>;

const rawRequest = z.object({
  path: z.string(),
  method: method,
  query: z.string().nullable(),
  body: z.any().nullable(),
});

export type RawRequest = z.infer<typeof rawRequest>;

export type Config = z.infer<typeof configSchema>;

const endpointSchema = z.object({
  path: z.string(),
  methods: z.array(method),
  query: z.string(),
});

export type Endpoint = z.infer<typeof endpointSchema>;

export const configSchema = z.object({
  graphqlServer: z.object({
    headers: z.object({
      additional: z.record(z.string(), z.string()),
      forward: z.array(z.string()),
    }),
  }),
  headers: z.record(z.string(), z.string()),
  restifiedEndpoints: z.array(endpointSchema),
});
