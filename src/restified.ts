import { Config } from "./config";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("restified-endpoints-plugin");

interface RawRequest {
  path: string;
  method: string;
  // query can be null as well
  query: string | null;
  // body can be null as well
  body: JSON | null;
}

export const restifiedHandler = (request) => {
  return tracer.startActiveSpan("Handle request", async (span) => {
    // Authentication
    if (
      request.headers === null ||
      request.headers.get("hasura-m-auth") !== Config.headers["hasura-m-auth"]
    ) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String("Unauthorized request!"),
      });
      span.end();
      return new Response(JSON.stringify({ message: "unauthorized request" }), {
        status: 400,
      });
    }
    // extract information from request body:
    // {"path":"/v1/rest/users/5" ,"method":"GET","query":"limit=10&offset=0"}
    const body = await request.json();
    const requestBody: RawRequest = body;

    const url = new URL(request.url);
    const path = requestBody.path;
    const method = requestBody.method;

    // Find matching RESTified endpoint
    const endpoint = Config.restifiedEndpoints.find(
      (e) => matchPath(e.path, path) && e.methods.includes(method),
    );

    if (!endpoint) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String("Endpoint not found"),
      });
      span.end();
      return new Response(JSON.stringify({ message: "Endpoint not found" }), {
        status: 400,
      });
    }

    // Extract variables
    const variables = extractVariables(requestBody, endpoint);

    // Execute GraphQL query
    try {
      const result = await executeGraphQL(endpoint.query, variables, request);
      span.setStatus({
        code: SpanStatusCode.OK,
        message: String("Query executed successfully"),
      });
      span.end();
      return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(`GraphQL execution error: ${error.message}`),
      });
      span.end();
      return new Response(
        JSON.stringify({ message: "Internal server error" }),
        { status: 500 },
      );
    }
  });
};

function extractVariables(request: RawRequest, endpoint) {
  // This should handle route patterns, query parameters, and request body
  // We can have two types of variables in the request (which is GET for now):
  // 1. Path parameters (e.g., /v1/users/:id)
  // 2. Query parameters (e.g., /v1/users?id=1)
  // We can have both as well

  // our request looks something like:
  // {"path":"/v1/users/1","method":"GET","query":"foo=bar&hello=world"}
  const endpointPath = endpoint.path; // /v1/users/:id
  const requestPath = request.path; // /v1/users/1
  const variables = {};
  // Split the endpoint path and request path into segments
  const endpointSegments = endpointPath.split("/");
  const requestSegments = requestPath.split("/");
  // Iterate over the segments and extract variables
  for (let i = 0; i < endpointSegments.length; i++) {
    const endpointSegment = endpointSegments[i];
    const requestSegment = requestSegments[i];
    if (endpointSegment.startsWith(":")) {
      const variableName = endpointSegment.slice(1);
      variables[variableName] = (() => {
        try {
          return JSON.parse(requestSegment);
        } catch (e) {
          return requestSegment;
        }
      })();
    }
  }
  const queryParams = new URLSearchParams(request.query);
  for (const [key, value] of queryParams.entries()) {
    variables[key] = (() => {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    })();
  }
  // Extract variables from the request body
  console.log(request.body);
  if (request.body) {
    for (const [key, value] of Object.entries(request.body)) {
      variables[key] = value;
    }
  }
  console.log(variables);
  return variables;
}

async function executeGraphQL(query, variables, request) {
  const response = await fetch(Config.graphqlServer.url, {
    method: "POST",
    headers: {
      ...Config.graphqlServer.headers.forward.reduce((acc, header) => {
        const value = request.headers.get(header);
        if (value) acc[header] = value;
        return acc;
      }, {}),
      ...Config.graphqlServer.headers.additional,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
  }
  return response.json();
}

function matchPath(endpointPathTemplate: string, path: string): boolean {
  // This function should return true if the path matches the endpoint path template
  // This should handle route patterns (e.g., /v1/users/:id)
  let toReturn = true;
  const endpointSegments = endpointPathTemplate.split("/");
  const pathSegments = path.split("/");
  for (let i = 0; i < endpointSegments.length; i++) {
    const endpointSegment = endpointSegments[i];
    const pathSegment = pathSegments[i];
    if (endpointSegment !== pathSegment && !endpointSegment.startsWith(":")) {
      toReturn = false;
    }
  }
  return toReturn;
}
