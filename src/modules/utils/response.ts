import { SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "../tracing/tracer";

export function createResponse(body: any, status: number): Response {
  return tracer.startActiveSpan("createResponse", (span) => {
    span.setAttribute("internal.visibility", String("user"));
    try {
      span.setAttribute("response.status", String(status));
      span.setAttribute(
        "response.body_size",
        String(JSON.stringify(body).length),
      );

      const response = new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return response;
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
