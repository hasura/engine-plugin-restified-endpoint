import { SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "../tracing/tracer";

// Request parsing
export async function parseRequestBody(request: Request | any): Promise<any> {
  return tracer.startActiveSpan("parseRequestBody", async (span) => {
    span.setAttribute("internal.visibility", String("user"));
    try {
      const body =
        typeof request.json === "function"
          ? await request.json()
          : request.body;
      span.setAttribute("request.hasBody", String(!!body));
      span.setStatus({ code: SpanStatusCode.OK });
      return body;
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
