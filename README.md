# RESTified GraphQL Endpoints Plugin for Hasura DDN

## Overview

This plugin for Hasura DDN (Distributed Data Network) allows you to add RESTified GraphQL endpoints to the DDN supergraph. It transforms GraphQL queries into REST-like endpoints, making it easier to integrate with systems that prefer REST APIs.

## Features

- Transform GraphQL queries into REST-like endpoints
- Configurable endpoint mapping
- Authentication support
- Variable extraction from URL parameters, query strings, and request body
- OpenTelemetry integration for tracing

## How it works

1. The plugin starts a server that listens for incoming requests.
2. When a request is received, it checks if it matches any configured RESTified endpoints.
3. If a match is found, the plugin:
   - Extracts variables from the request (URL parameters, query string, body)
   - Executes the corresponding GraphQL query with the extracted variables
   - Returns the GraphQL response as a REST-style JSON response

## Configuration

Configure the plugin in `src/config.ts`:

- `graphqlServer`: GraphQL server settings (headers)
- `headers`: Authentication headers
- `restifiedEndpoints`: Array of RESTified endpoint configurations

Example configuration:

```typescript
export const Config = {
  graphqlServer: {
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
      path: "/v1/api/rest/albums/:offset",
      methods: ["GET"],
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
```

Configure the graphql server URL in `.dev.vars`:

```toml
[vars]
GRAPHQL_SERVER_URL = "<GRAPHQL_SERVER_URL>"
```

## Development

**Note**: We are using Cloudflare wrangler for local development and deployment. However, you can use any other tool for the same. You will have to modify the files accordingly.

### Local development

To run the plugin locally, you can use the following steps:

1. Install wrangler:

   ```sh
   npm install -g wrangler
   ```

2. Clone this repository:

   ```sh
   git clone https://github.com/your-org/engine-plugin-restified-endpoint.git
   cd engine-plugin-restified-endpoint
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

4. Start the local development server:

   ```sh
   npm start
   ```

The above command will start a local server that listens for incoming requests. The server runs on port 8787 by default. The URL of the local server will be displayed in the terminal.

### Cloud deployment

For cloud deployment, you can use the following steps in addition to the local development steps:

1. Create an account on Cloudflare.

2. Login to Cloudflare:

   ```sh
   wrangler login
   ```

3. Deploy to Cloudflare:

   ```sh
   npm run deploy
   ```

The above command should deploy the RESTified endpoints plugin (as a lambda) using Cloudflare workers. The URL of the deployed plugin will be displayed in the terminal.

## Using the plugin in DDN

Update the metadata to add the plugin-related config (in global subgraph). Also, add the env vars for the URL of local dev and cloud deployment:

```yaml
kind: LifecyclePluginHook
version: v1
definition:
  name: restified_endpoints
  url:
    valueFromEnv: RESTIFIED_ENDPOINTS_URL
  pre: route
  config:
    match: "/v1"
    request:
      headers:
        additional:
          hasura-m-auth:
            value: <your-secret-token>
        forward:
          - Authorization
          - X-Hasura-Role
      session: {}
      rawRequest:
        path: {}
        query: {}
        method: {}
```

Build DDN supergraph:

```sh
ddn supergraph build create
```

Please update the GRAPHQL_SERVER_URL variable in the `wrangler.toml` with the project's graphql endpoint.

**Note**: For end-to-end tracing, you would have to update the `wrangler.toml` file to add the Hasura PAT in `OTEL_EXPORTER_PAT` var.

## Adding new RESTified endpoints

To add new RESTified endpoints, update the `restifiedEndpoints` array in `src/config.ts`. For example:

```typescript
restifiedEndpoints: [
  {
    path: "/v1/api/rest/users/:id",
    methods: ["GET"],
    query: `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `,
  },
  {
    path: "/v1/api/rest/posts",
    method: ["POST"],
    query: `
      mutation CreatePost($title: String!, $content: String!) {
        createPost(input: { title: $title, content: $content }) {
          id
          title
        }
      }
    `,
  },
];
```

After adding new endpoints, redeploy the plugin for the changes to take effect.

## Limitations and Future Improvements

- Currently, the plugin supports basic variable extraction. More complex scenarios might require additional implementation.
- OpenAPI Spec documentation generation is not yet implemented.
- Rate limiting is not currently supported within the plugin.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
