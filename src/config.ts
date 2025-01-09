export const Config = {
  graphqlServer: {
    url: "http://localhost:3000/graphql",
    headers: {
      additional: {
        "Content-Type": "application/json",
      },
      forward: ["X-Hasura-Role"],
    },
  },
  headers: {
    "hasura-m-auth": "zZkhKqFjqXR4g5MZCsJUZCcoPyZ",
  },
  restifiedEndpoints: [
    {
      path: "/v1/restified/:offset",
      method: "GET",
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
