/**
 * Welcome to Cloudflare Workers! This is Hasura's restified endpoints template.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { trace } from "@opentelemetry/api";
import { restifiedHandler } from "./restified";
import { instrument, ResolveConfigFn } from "@microlabs/otel-cf-workers";

const handler = {
  async fetch(request, env, ctx) {
    trace.getActiveSpan()?.setAttribute("internal.visibility", String("user"));
    return restifiedHandler(request);
  },
};

const resolveConfig: ResolveConfigFn = (env, _trigger) => {
  let pat: string = env.OTEL_EXPORTER_PAT;
  return {
    exporter: {
      url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers: {
        Authorization: `pat ${pat}`,
      },
    },
    service: { name: "restified-endpoints-plugin" },
  };
};

export default instrument(handler, resolveConfig);
