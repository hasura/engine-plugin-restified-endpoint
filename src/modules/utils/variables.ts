import { tracer } from "../tracing/tracer";
import { SpanStatusCode } from "@opentelemetry/api";
import { RawRequest } from "./types";

export function parseValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// This should handle route patterns, query parameters, and request body
// We can have two types of variables in the request (which is GET for now):
// 1. Path parameters (e.g., /v1/users/:id)
// 2. Query parameters (e.g., /v1/users?id=1)
// We can have both as well

// our request looks something like:
// {"path":"/v1/users/1","method":"GET","query":"foo=bar&hello=world"}
export function extractVariables(
  request: RawRequest,
  endpoint: any,
): Record<string, any> {
  return tracer.startActiveSpan("extractVariables", (span) => {
    span.setAttribute("internal.visibility", String("user"));
    try {
      const variables: Record<string, any> = {};

      // Path parameters
      // Split the endpoint path and request path into segments
      const endpointSegments = endpoint.path.split("/"); // /v1/users/:id
      const requestSegments = request.path.split("/"); // /v1/users/1

      span.setAttribute(
        "variables.path_segments",
        String(endpointSegments.length),
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
        String(Object.keys(variables).length),
      );
      span.setAttribute(
        "variables.keys",
        JSON.stringify(Object.keys(variables)),
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
