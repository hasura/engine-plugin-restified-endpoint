# RESTified GraphQL Endpoints Plugin for Hasura DDN

## Overview

This plugin for Hasura DDN (Distributed Data Network) allows you to add RESTified GraphQL endpoints to the DDN
supergraph. It transforms GraphQL queries into REST-like endpoints, making it easier to integrate with systems that
prefer REST APIs.

Documentation can be found [here](https://hasura.io/docs/3.0/plugins/restified-endpoints/).

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

Configure the graphql server URL in `.dev.vars`:

```toml
[vars]
GRAPHQL_SERVER_URL = "<GRAPHQL_SERVER_URL>"
```

## Development (Cloudflare wrangler)

This plugin can be developed and deployed using Cloudflare wrangler.

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

The above command will start a local server that listens for incoming requests. The server runs on port 8787 by default.
The URL of the local server will be displayed in the terminal.

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

The above command should deploy the RESTified endpoints plugin (as a lambda) using Cloudflare workers. The URL of the
deployed plugin will be displayed in the terminal.

## Development (Express)

To run the plugin locally using Express, you can use the following steps:

1. Install dependencies:

   ```sh
   npm install
   ```

2. Build the project:

   ```sh
   npm run build
   ```

3. Export the environment variables:

   ```sh
   export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces"
   export OTEL_EXPORTER_PAT="your-pat-here"
   export GRAPHQL_SERVER_URL="http://localhost:3280/graphql"
   ```

4. Start the server:

   ```sh
   npm run serve
   ```

The above command will start a local server that listens for incoming requests. The server runs on port 8787 by default.

## Limitations and Future Improvements

- Currently, the plugin supports basic variable extraction. More complex scenarios might require additional
  implementation.
- OpenAPI Spec documentation generation is not yet implemented.
- Rate limiting is not currently supported within the plugin.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
