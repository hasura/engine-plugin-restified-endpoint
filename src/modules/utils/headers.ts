import { context, propagation } from "@opentelemetry/api";

// Header handling
export function getHeader(request: any, headerName: string): string | null {
  const value =
    request.headers?.get && typeof request.headers.get === "function"
      ? request.headers.get(headerName)
      : request.headers?.[headerName.toLowerCase()] ?? null;
  
  return value;
}

// Trace header injection
export function injectTraceHeaders(): Record<string, string> {
  const traceHeaders: Record<string, string> = {};
  propagation.inject(context.active(), traceHeaders);
  return traceHeaders;
}
