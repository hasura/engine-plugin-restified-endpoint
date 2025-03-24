import { Config } from "./modules/utils/types";

// This configuration is used to configure the plugin when it is used
// in development with Wrangler
export const config: Config = {
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
