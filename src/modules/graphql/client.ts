import { tracer } from "../tracing/tracer";
import { SpanStatusCode } from "@opentelemetry/api";
import { getHeader, injectTraceHeaders } from "../utils/headers";
import { config } from "../../config";

interface GraphQLResponse {
  data?: unknown;
  errors?: Array<{ message: string }>;
}

export async function executeGraphQL(
  query: string,
  variables: unknown,
  request: unknown,
  graphqlServerUrl: string,
): Promise<GraphQLResponse> {
  return tracer.startActiveSpan("executeGraphQL", async (span) => {
    span.setAttribute("internal.visibility", String("user"));
    try {
      span.setAttribute("graphql.server_url", graphqlServerUrl);
      span.setAttribute("graphql.query_length", String(query.length));
      span.setAttribute(
        "graphql.variables_count",
        String(Object.keys(variables).length),
      );

      // Get the current trace context and inject it into headers
      const traceHeaders = injectTraceHeaders();

      const forwardedHeaders = config.graphqlServer.headers.forward.reduce(
        (acc: Record<string, string>, header: string) => {
          const value = getHeader(request, header);
          if (value) acc[header] = value;
          return acc;
        },
        {},
      );

      span.setAttribute(
        "headers.forwarded_count",
        String(Object.keys(forwardedHeaders).length),
      );

      const response = await fetch(graphqlServerUrl, {
        method: "POST",
        headers: {
          ...traceHeaders,
          ...forwardedHeaders,
          ...config.graphqlServer.headers.additional,
        },
        body: JSON.stringify({ query, variables }),
      });

      span.setAttribute("response.status", String(response.status));

      if (!response.ok) {
        throw new Error(
          `GraphQL request to ${graphqlServerUrl} failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      span.setAttribute("response.has_errors", String(!!result.errors));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
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
}
