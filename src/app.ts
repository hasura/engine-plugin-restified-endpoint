import express from "express";

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { SpanStatusCode, context, propagation } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";
import { CompositePropagator } from "@opentelemetry/core";
import { tracer } from "./modules/tracing/tracer";
import { configSchema } from "./modules/utils/types";
import { Config } from "./modules/utils/types";
import { routeHandler } from "./handler";
import pino from "pino-http";

// Add type for trace headers
interface TraceHeaders {
  [key: string]: string;
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  // Register both W3C and B3 propagators
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new B3Propagator({
          injectEncoding: B3InjectEncoding.MULTI_HEADER, // Use multi-header B3 format
        }),
      ],
    }),
  );

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: process.env.OTEL_EXPORTER_PAT
      ? {
          Authorization: `pat ${process.env.OTEL_EXPORTER_PAT}`,
        }
      : {},
  });

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "restified-endpoints-express",
  });

  const provider = new NodeTracerProvider({
    resource,
    spanProcessors: [new SimpleSpanProcessor(traceExporter)],
  });

  provider.register();

  registerInstrumentations({ instrumentations: [new HttpInstrumentation()] });
}

const app = express();
const port = process.env.PORT || 8787;

// Logging middleware
app.use(
  pino({
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.hasura-m-auth",
        "req.headers.x-hasura-ddn-token",
      ].concat(
        process.env.REDACTED_HEADERS
          ? process.env.REDACTED_HEADERS.split(",")
              .map((key) => key.trim())
              .filter((key) => key)
          : [],
      ), // Specify headers to redact
      censor: "[REDACTED]", // Optional: replace with a custom string
    },
  }),
);

// Middleware to parse JSON bodies
app.use(express.json());

// Add middleware to extract trace context
app.use((req, res, next) => {
  const extractedContext = propagation.extract(context.active(), req.headers);
  return context.with(extractedContext, () => {
    next();
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  return tracer.startActiveSpan("health-check", (span) => {
    try {
      span.setAttribute("internal.visibility", String("user"));
      span.setAttribute("endpoint", "/health");
      res.json({ status: "healthy" });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
});

function getConfig(): Config {
  const configPath = process.env.HASURA_DDN_PLUGIN_CONFIG_PATH;

  const configInput = configPath
    ? require(`${configPath}/configuration.json`)
    : undefined;

  // parse config or explode
  // https://zod.dev/ERROR_HANDLING?id=formatting-errors
  const parsedConfig = configSchema.parse(configInput);

  return parsedConfig;
}

const graphqlUrl =
  process.env.GRAPHQL_SERVER_URL || "http://localhost:3000/graphql";

// Main handler for all routes
app.all("/", routeHandler(graphqlUrl, getConfig()));

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    tracer.startActiveSpan("server-start", (span) => {
      try {
        span.setAttribute("server.port", port);
        span.setAttribute("graphql.url", graphqlUrl);

        console.log(`Server is running on port ${port}`);
        console.log(`GraphQL Server URL: ${graphqlUrl}`);

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  });
}

export default app;
