import { trace } from "@opentelemetry/api";

export const tracer = trace.getTracer("restified-endpoints-plugin");