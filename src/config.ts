import { z } from "zod";

export type Config = z.infer<typeof configSchema>;

export const method = z.enum(["GET", "POST", "PUT", "DELETE"]);

export type Method = z.infer<typeof method>;

const endpointSchema = z.object({
    path: z.string(),
    methods: z.array(method),
    query: z.string(),
  })

export type Endpoint = z.infer<typeof endpointSchema>;

export const configSchema = z.object({
  graphqlServer: z.object({ 
    headers: z.object({
      additional: z.record(z.string(),z.string()),
      forward: z.array(z.string()),
    }),
  }),
  headers: z.record(z.string(),z.string()),
  restifiedEndpoints: z.array(endpointSchema)
});

// This configuration is used to configure the plugin when it is used 
// in development with Wrangler
export const config:Config = {
  graphqlServer: {
    headers: {
      additional: {
        "Content-Type": "application/json",
      },
      forward: ["X-Hasura-Role", "Authorization", "X-Hasura-ddn-token"],
    },
  },
  headers: {
    "hasura-m-auth": "zZkhKqFjqXR4g5MZCsJUZCcoPyZ",
  },
  restifiedEndpoints: [
    {
      path: "/v1/api/rest/albums/:offset",
      methods: ["GET", "POST"],
      query: `
        query MyQuery($limit: Int = 10, $offset: Int = 10) {
          Album(limit: $limit, offset: $offset) {
            Title
          }
        }
      `,
    },
    // Add more RESTified endpoints here
  ],
};


