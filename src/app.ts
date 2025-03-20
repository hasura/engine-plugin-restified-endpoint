import express from "express";
import { restifiedHandler } from "./restified";

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { SpanStatusCode, context, propagation } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";
import { CompositePropagator } from "@opentelemetry/core";
import { tracer } from "./modules/tracing/tracer";
import { configSchema } from "./config";

// Add type for trace headers
interface TraceHeaders {
  [key: string]: string;
}

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

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "restified-endpoints-express",
  }),
});

const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:4318/v1/traces",
  headers: {
    Authorization: `pat ${process.env.OTEL_EXPORTER_PAT || ""}`,
  },
});

provider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
provider.register();

registerInstrumentations({ instrumentations: [new HttpInstrumentation()] });

const app = express();
const port = process.env.PORT || 8787;

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

// Main handler for all routes
app.all("/", async (req, res) => {
  return tracer.startActiveSpan("handle-request", async (span) => {
    try {
      span.setAttribute("internal.visibility", String("user"));
      span.setAttribute("request.url", req.url);
      span.setAttribute("request.method", req.method);

      // Log request details with trace context
      span.addEvent("request.received", {
        body: JSON.stringify(req.body),
        url: req.url,
      });

      const configPath = process.env.CONFIG_PATH;

      const configInput = configPath ? require(configPath) : undefined;

      // parse config or explode
      const parsedConfig = configSchema.parse(configInput);

      const graphqlUrl =
        process.env.GRAPHQL_SERVER_URL || "http://localhost:3000/graphql";
      span.setAttribute("graphql.url", graphqlUrl);

      // Handle the request
      const response = await restifiedHandler(req, graphqlUrl, parsedConfig);
      const responseData = await response.json();

      // Log response details
      span.addEvent("response.processed", {
        status: response.status,
      });

      // Send the response
      res.status(response.status).json(responseData);

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(error),
      });

      span.recordException(error);
      span.addEvent("error.handled", {
        error: error.message,
        stack: error.stack,
      });

      console.error("Error handling request:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      span.end();
    }
  });
});

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    tracer.startActiveSpan("server-start", (span) => {
      try {
        const graphqlUrl =
          process.env.GRAPHQL_SERVER_URL || "http://localhost:3000/graphql";
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
