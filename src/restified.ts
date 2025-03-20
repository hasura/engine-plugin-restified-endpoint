import { Config } from "./modules/utils/types";
import { SpanStatusCode } from "@opentelemetry/api";
import { executeGraphQL } from "./modules/graphql/client";
import { createResponse } from "./modules/utils/response";
import { extractVariables } from "./modules/utils/variables";
import { matchPath } from "./modules/utils/path";
import { getHeader } from "./modules/utils/headers";
import { parseRequestBody } from "./modules/utils/request";
import { tracer } from "./modules/tracing/tracer";
import { Request } from "express";

// Main handler
export const restifiedHandler = (
  request: Request,
  graphqlServerUrl: string,
  config: Config,
) => {
  return tracer.startActiveSpan("restifiedHandler", async (parentSpan) => {
    parentSpan.setAttribute("internal.visibility", String("user"));
    try {
      parentSpan.setAttribute("request.url", request.url);
      parentSpan.setAttribute("request.method", request.method);

      // Authentication
      const authSpan = tracer.startSpan("authentication");
      const authHeader = getHeader(request, "hasura-m-auth");
      if (!authHeader || authHeader !== config.headers["hasura-m-auth"]) {
        authSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: String("Unauthorized request!"),
        });
        authSpan.end();
        return createResponse({ message: "unauthorized request" }, 401);
      }
      authSpan.setStatus({ code: SpanStatusCode.OK });
      authSpan.end();

      // Parse request body
      // {"path":"/v1/rest/users/5" ,"method":"GET","query":"limit=10&offset=0"}
      const rawRequest = await parseRequestBody(request);
      if (!rawRequest?.path || !rawRequest?.method) {
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

      parentSpan.setAttribute("request.path", rawRequest.path);
      parentSpan.setAttribute("request.body_method", rawRequest.method);

      // Find matching endpoint
      const endpoint = config.restifiedEndpoints.find(
        (e) =>
          matchPath(e.path, rawRequest.path) &&
          e.methods.includes(rawRequest.method),
      );

      if (!endpoint) {
        parentSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: String("Endpoint not found"),
        });
        return createResponse(
          {
            message: "Endpoint not found",
            requestedPath: rawRequest.path,
            requestedMethod: rawRequest.method,
          },
          404,
        );
      }

      parentSpan.setAttribute("endpoint.path", endpoint.path);
      parentSpan.setAttribute("endpoint.method", rawRequest.method);

      // Execute query
      const variables = extractVariables(rawRequest, endpoint);
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
