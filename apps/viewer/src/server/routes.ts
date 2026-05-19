import { writeFile } from "node:fs/promises";

import type { ViewerMode } from "../shared/api-types.ts";

import { clearDraft, loadDraft, saveDraft, saveFeedback, type PlanMeta } from "./storage.ts";

/** Outcome of the reviewer's interaction with a plan. */
export type Decision =
  | { kind: "approve" }
  | { kind: "deny"; feedback: string }
  | { kind: "feedback"; feedback: string };

interface RouteContext {
  plan: string;
  meta: PlanMeta;
  mode: ViewerMode;
  resolve: (decision: Decision) => void;
  /** When set, the most recent decision is persisted here for out-of-band readers (e.g. Playwright). */
  decisionFile?: string | null;
}

const recordDecision = async (path: string, decision: Decision): Promise<void> => {
  const payload = JSON.stringify({ ...decision, at: Date.now() });
  await writeFile(path, payload, "utf8");
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const planRoute = (ctx: RouteContext): Response =>
  jsonResponse({ plan: ctx.plan, mode: ctx.mode, meta: ctx.meta });

const approveRoute = async (ctx: RouteContext): Promise<Response> => {
  const decision: Decision = { kind: "approve" };
  if (ctx.decisionFile !== undefined && ctx.decisionFile !== null) {
    await recordDecision(ctx.decisionFile, decision);
  }
  ctx.resolve(decision);
  return new Response(null, { status: 204 });
};

const denyRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as { feedback?: string } | null;
  const feedback = body?.feedback ?? "";
  const decision: Decision = { kind: "deny", feedback };
  if (ctx.decisionFile !== undefined && ctx.decisionFile !== null) {
    await recordDecision(ctx.decisionFile, decision);
  }
  ctx.resolve(decision);
  return new Response(null, { status: 204 });
};

const draftGetRoute = async (ctx: RouteContext): Promise<Response> => {
  const raw = await loadDraft(ctx.meta);
  if (raw === null) return new Response(null, { status: 204 });
  return new Response(raw, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

const draftPostRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const raw = await req.text();
  await saveDraft(ctx.meta, raw);
  return new Response(null, { status: 204 });
};

const draftDeleteRoute = async (ctx: RouteContext): Promise<Response> => {
  await clearDraft(ctx.meta);
  return new Response(null, { status: 204 });
};

const feedbackRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as { feedback?: string } | null;
  const feedback = body?.feedback ?? "";
  await saveFeedback(ctx.meta, feedback);
  const decision: Decision = { kind: "feedback", feedback };
  if (ctx.decisionFile !== undefined && ctx.decisionFile !== null) {
    await recordDecision(ctx.decisionFile, decision);
  }
  ctx.resolve(decision);
  return new Response(null, { status: 204 });
};

type Handler = (req: Request, ctx: RouteContext) => Response | Promise<Response>;
type RouteKey = `${string} ${string}`;

const routes: Record<RouteKey, Handler> = {
  "GET /api/plan": (_req, ctx) => planRoute(ctx),
  "POST /api/approve": (_req, ctx) => approveRoute(ctx),
  "POST /api/deny": (req, ctx) => denyRoute(req, ctx),
  "POST /api/feedback": (req, ctx) => feedbackRoute(req, ctx),
  "GET /api/draft": (_req, ctx) => draftGetRoute(ctx),
  "POST /api/draft": (req, ctx) => draftPostRoute(req, ctx),
  "DELETE /api/draft": (_req, ctx) => draftDeleteRoute(ctx),
};

export type { RouteContext };

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
