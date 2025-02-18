import { SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "../tracing/tracer";

// Path matching
export function matchPath(pattern: string, path: string): boolean {
  return tracer.startActiveSpan("matchPath", (span) => {
    span.setAttribute("internal.visibility", String("user"));
    try {
      span.setAttribute("path.pattern", pattern);
      span.setAttribute("path.actual", path);

      const patternParts = pattern.split("/");
      const pathParts = path.split("/");

      if (patternParts.length !== pathParts.length) {
        span.setAttribute("path.match", "false");
        span.setAttribute("path.mismatch_reason", "length");
        span.setStatus({ code: SpanStatusCode.OK });
        return false;
      }

      const matches = patternParts.every((part, index) => {
        return part.startsWith(":") || part === pathParts[index];
      });

      span.setAttribute("path.match", String(matches));
      span.setStatus({ code: SpanStatusCode.OK });
      return matches;
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
