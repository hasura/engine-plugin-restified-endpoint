import { Config } from "./config";
import { SpanStatusCode } from "@opentelemetry/api";
import { executeGraphQL } from "./modules/graphql/client";
import { createResponse } from "./modules/utils/response";
import { extractVariables } from "./modules/utils/variables";
import { matchPath } from "./modules/utils/path";
import { getHeader } from "./modules/utils/headers";
import { parseRequestBody } from "./modules/utils/request";
import { tracer } from "./modules/tracing/tracer";

// Main handler
export const restifiedHandler = (
  request: Request | any,
  graphqlServerUrl: string,
) => {
  return tracer.startActiveSpan("restifiedHandler", async (parentSpan) => {
    parentSpan.setAttribute("internal.visibility", String("user"));
    try {
      parentSpan.setAttribute("request.url", request.url);
      parentSpan.setAttribute("request.method", request.method);

      // Authentication
      const authSpan = tracer.startSpan("authentication");
      const authHeader = getHeader(request, "hasura-m-auth");
      if (!authHeader || authHeader !== Config.headers["hasura-m-auth"]) {
        authSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: String("Unauthorized request!"),
        });
        authSpan.end();
        return createResponse({ message: "unauthorized request" }, 401);
      }
      authSpan.setStatus({ code: SpanStatusCode.OK });
      authSpan.end();

      // Parse request
      const requestBody = await parseRequestBody(request);
      if (!requestBody?.path || !requestBody?.method) {
        return createResponse(
          {
            message: "Invalid request body",
            required: {
              path: "string",
              method: "string",
              query: "string (optional)",
              body: "object (optional)",
            },
          },
          400,
        );
      }

      parentSpan.setAttribute("request.path", requestBody.path);
      parentSpan.setAttribute("request.body_method", requestBody.method);

      // Find matching endpoint
      const endpoint = Config.restifiedEndpoints.find(
        (e) =>
          matchPath(e.path, requestBody.path) &&
          e.methods.includes(requestBody.method),
      );

      if (!endpoint) {
        parentSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: String("Endpoint not found"),
        });
        return createResponse(
          {
            message: "Endpoint not found",
            requestedPath: requestBody.path,
            requestedMethod: requestBody.method,
          },
          404,
        );
      }

      parentSpan.setAttribute("endpoint.path", endpoint.path);
      parentSpan.setAttribute("endpoint.method", requestBody.method);

      // Execute query
      const variables = extractVariables(requestBody, endpoint);
      const result = await executeGraphQL(
        endpoint.query,
        variables,
        request,
        graphqlServerUrl,
      );

      parentSpan.setStatus({
        code: SpanStatusCode.OK,
        message: String("Request processed successfully"),
      });
      return createResponse(result, 200);
    } catch (error) {
      parentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(`Request failed: ${error.message}`),
      });
      return createResponse(
        {
          message: "Internal server error",
          error: error.message,
          ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        },
        500,
      );
    } finally {
      parentSpan.end();
    }
  });
};
