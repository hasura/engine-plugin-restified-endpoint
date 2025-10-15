# RESTified GraphQL Endpoints Plugin for Hasura DDN

## Overview

This plugin for Hasura DDN (Distributed Data Network) allows you to add RESTified GraphQL endpoints to the DDN
supergraph. It transforms GraphQL queries into REST-like endpoints, making it easier to integrate with systems that
prefer REST APIs.

Documentation can be found [here](https://hasura.io/docs/3.0/plugins/restified-endpoints/).

If you want to quickly get started with the plugin in a Hasura DDN project, check out the [quickstart
guide](https://hasura.io/docs/3.0/plugins/restified-endpoints/how-to).

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

## Deployment

### Docker

Create a configuration file and run it with docker: 

```
docker run -v ./configuration.json:/config/configuration.json \
   -e HASURA_DDN_PLUGIN_CONFIG_PATH=/config \
   -e GRAPHQL_SERVER_URL=http://engine:3000/graphql \
   -e HASURA_M_AUTH=randomsecret \
   ghcr.io/hasura/engine-plugin-restified-endpoint:latest
```

### Docker Compose

```yaml
services:
  plugin:
    image: ghcr.io/hasura/engine-plugin-restified-endpoint:latest
    ports:
      - 8787:8787
    environment:
      HASURA_DDN_PLUGIN_CONFIG_PATH: "/config"
      GRAPHQL_SERVER_URL: "http://engine:3000/graphql"
      HASURA_M_AUTH: <api-key for hasura-m-auth header>
      # Optional OpenTelemetry config
      # OTEL_SERVICE_NAME: "plugin"
      # OTEL_EXPORTER_OTLP_ENDPOINT: "http://jaeger:4317"
    volumes:
      - type: bind
        source: ./config/plugin/
        target: /config/
        read_only: true
```

### AWS Lambda with CDK

AWS Lambda requires us to upload the source code. So you need to clone this repo and edit codes directly.

1. Edit configuration at `src/config.ts`.
2. Edit the GraphQL endpoint at `src/lambda.ts`.
3. Build the code

```
npm run build
```

4. Install required dependencies for Lambda runtime

```bash
cp package.lambda.json dist/package.json
cd dist && npm install && cd ..
```

5. Install AWS CDK `npm install -g aws-cdk`.
6. Export AWS credentials environment variables.
7. Edit the desired region config in `bin/serverless-aws.ts`.
8. Run bootstrap for the first deployment.

```bash
cdk synth
cdk bootstrap
```

8. Deploy the stack.

```bash
cdk deploy
```

### CloudFlare worker

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
   export HASURA_DDN_PLUGIN_CONFIG_PATH="../tests/config/plugin"
   ```

4. Start the server:

   ```sh
   npm run serve
   ```

The above command will start a local server that listens for incoming requests. The server runs on port 8787 by default.

**Note:** You can also use `npm run serve-dev` to start the server in development mode, which will automatically restart
the server when changes are made to the code.

## Development (Cloudflare wrangler)

This plugin can be developed and deployed using Cloudflare wrangler.

### Configuration

Configure the graphql server URL in `.dev.vars`:

```toml
[vars]
GRAPHQL_SERVER_URL = "<GRAPHQL_SERVER_URL>"
```

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

## Testing

To run the tests, use the following commands:

1. Start the services required for testing:

   ```sh
   docker compose -f tests/docker-compose.yaml up
   ```

2. Run the tests:

   ```sh
   npm test
   ```

## Limitations and Future Improvements

- Currently, the plugin supports basic variable extraction. More complex scenarios might require additional
  implementation.
- OpenAPI Spec documentation generation is not yet implemented.
- Rate limiting is not currently supported within the plugin.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
