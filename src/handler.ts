import { SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "./modules/tracing/tracer";
import { Config } from "./modules/utils/types";
import { restifiedHandler } from "./restified";

export const routeHandler =
  (graphqlUrl: string, config: Config) => async (req, res) => {
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

        span.setAttribute("graphql.url", graphqlUrl);
        req.log.debug({  body: req.body, graphqlUrl: graphqlUrl }, 'received restified request');
        
        // Handle the request
        const response = await restifiedHandler(req, graphqlUrl, config);
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
  };
