import { SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "../tracing/tracer";
import { RawRequest } from "./types";
import { Request } from "express";

// Request parsing
export async function parseRequestBody(request: Request): Promise<RawRequest> {
  return tracer.startActiveSpan("parseRequestBody", async (span) => {
    span.setAttribute("internal.visibility", String("user"));
    try {
      const body = request.body;
      /*        typeof request.json === "function"
          ? await request.json()
          : request.body; */
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
