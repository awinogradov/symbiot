import type { PlanMeta } from "./storage.ts";

/** Outcome of the reviewer's interaction with a plan. */
export type Decision = { kind: "approve" } | { kind: "deny"; feedback: string };

interface RouteContext {
  plan: string;
  meta: PlanMeta;
  resolve: (decision: Decision) => void;
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const planRoute = (ctx: RouteContext): Response =>
  jsonResponse({ plan: ctx.plan, mode: "plan", meta: ctx.meta });

const approveRoute = (ctx: RouteContext): Response => {
  ctx.resolve({ kind: "approve" });
  return new Response(null, { status: 204 });
};

const denyRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as { feedback?: string } | null;
  const feedback = body?.feedback ?? "";
  ctx.resolve({ kind: "deny", feedback });
  return new Response(null, { status: 204 });
};

type Handler = (req: Request, ctx: RouteContext) => Response | Promise<Response>;
type RouteKey = `${string} ${string}`;

const routes: Record<RouteKey, Handler> = {
  "GET /api/plan": (_req, ctx) => planRoute(ctx),
  "POST /api/approve": (_req, ctx) => approveRoute(ctx),
  "POST /api/deny": (req, ctx) => denyRoute(req, ctx),
};

/**
 * Dispatch /api/* routes. Returns null for non-API requests so the caller can
 * fall through to static-asset serving.
 */
export const handleApi = async (
  req: Request,
  url: URL,
  ctx: RouteContext
): Promise<Response | null> => {
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler !== undefined) return handler(req, ctx);
  if (url.pathname.startsWith("/api/")) return new Response("Not Found", { status: 404 });
  return null;
};
