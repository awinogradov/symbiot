import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { corsHeaders, isOriginAllowed } from "./cors.ts";
import { handleApi, type Decision } from "./routes.ts";
import { openBrowser } from "./openBrowser.ts";
import { savePlan, type PlanMeta } from "./storage.ts";
import { serveStatic } from "./staticAssets.ts";

/** Options for {@link startServer}. */
export interface StartServerOptions {
  plan: string;
  cwd?: string;
  openInBrowser?: boolean;
  staticRoot?: string;
}

/** Handle returned by {@link startServer} for resolving + tearing down the loop. */
export interface RunningServer {
  url: string;
  meta: PlanMeta;
  resolved: Promise<Decision>;
  stop: () => Promise<void>;
}

const defaultStaticRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "client"
);

interface RequestContext {
  plan: string;
  meta: PlanMeta;
  resolve: (decision: Decision) => void;
  origin: string;
  staticRoot: string;
}

const buildResponse = async (req: Request, ctx: RequestContext): Promise<Response> => {
  const url = new URL(req.url);
  const apiResponse = await handleApi(req, url, ctx);
  if (apiResponse !== null) return apiResponse;
  const staticResponse = await serveStatic(ctx.staticRoot, url.pathname);
  return staticResponse ?? new Response("Not Found", { status: 404 });
};

const withCors = (res: Response, headers: Record<string, string>): Response => {
  const merged = new Headers(res.headers);
  for (const [k, v] of Object.entries(headers)) merged.set(k, v);
  return new Response(res.body, { status: res.status, headers: merged });
};

const preflight = (origin: string | null, expected: string): Response =>
  new Response(null, { status: 204, headers: corsHeaders(origin, expected) });

const handle = async (req: Request, ctx: RequestContext): Promise<Response> => {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin, ctx.origin)) return new Response("Forbidden", { status: 403 });
  if (req.method === "OPTIONS") return preflight(origin, ctx.origin);
  const response = await buildResponse(req, ctx);
  return withCors(response, corsHeaders(origin, ctx.origin));
};

/**
 * Boot the symbiot viewer server. Binds to 127.0.0.1 on an OS-assigned port,
 * saves the plan to `~/.symbiot/history/...`, opens the browser, and returns a
 * promise that settles when the reviewer hits Approve or Request-changes.
 */
export const startServer = async (options: StartServerOptions): Promise<RunningServer> => {
  const meta = await savePlan(options.plan, options.cwd);
  let resolve!: (decision: Decision) => void;
  const resolved = new Promise<Decision>((r) => {
    resolve = r;
  });
  const staticRoot = options.staticRoot ?? defaultStaticRoot;
  let port = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (req: Request): Promise<Response> =>
      handle(req, {
        plan: options.plan,
        meta,
        resolve,
        origin: `http://127.0.0.1:${port}`,
        staticRoot,
      }),
  });
  port = server.port ?? 0;
  const url = `http://127.0.0.1:${port}/`;
  if (options.openInBrowser !== false) openBrowser(url);
  return {
    url,
    meta,
    resolved,
    stop: async () => {
      await server.stop();
    },
  };
};
