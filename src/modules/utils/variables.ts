import { tracer } from "../tracing/tracer";
import { SpanStatusCode } from "@opentelemetry/api";

export function parseValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function extractVariables(
  request: RawRequest,
  endpoint: any
): Record<string, any> {
  return tracer.startActiveSpan("extractVariables", (span) => {
    span.setAttribute('internal.visibility', String('user'));
    try {
      const variables: Record<string, any> = {};

      // Path parameters
      const endpointSegments = endpoint.path.split("/");
      const requestSegments = request.path.split("/");

      span.setAttribute(
        "variables.path_segments",
        String(endpointSegments.length)
      );

      endpointSegments.forEach((segment: string, index: number) => {
        if (segment.startsWith(":")) {
          const paramName = segment.slice(1);
          const value = requestSegments[index];
          if (value) {
            variables[paramName] = parseValue(value);
          }
        }
      });

      // Query parameters
      if (request.query) {
        const queryParams = new URLSearchParams(request.query);
        for (const [key, value] of queryParams.entries()) {
          variables[key] = parseValue(value);
        }
      }

      // Body parameters
      if (request.body && typeof request.body === "object") {
        Object.assign(variables, request.body);
      }

      span.setAttribute(
        "variables.count",
        String(Object.keys(variables).length)
      );
      span.setAttribute(
        "variables.keys",
        JSON.stringify(Object.keys(variables))
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return variables;
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
