import { writeFile } from "node:fs/promises";

import type { ViewerMode } from "../shared/api-types.ts";

import {
  clearDraft,
  loadDraft,
  loadUpload,
  saveDraft,
  saveFeedback,
  saveUpload,
  uploadPath,
  uploadsRoot,
  type PlanMeta,
} from "./storage.ts";
import {
  assertNoTraversal,
  assertWhitelistedExtension,
  isValidUuid,
  mintUuidFilename,
} from "./uploadSecurity.ts";

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

const badRequest = (message: string): Response =>
  new Response(message, { status: 400, headers: { "Content-Type": "text/plain" } });

const uploadRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("missing 'file' part");
  let extension: string;
  try {
    extension = assertWhitelistedExtension(file.name);
  } catch (error) {
    return badRequest((error as Error).message);
  }
  const filename = mintUuidFilename(extension);
  const target = uploadPath(ctx.meta, filename);
  try {
    assertNoTraversal(uploadsRoot, target);
  } catch (error) {
    return badRequest((error as Error).message);
  }
  const bytes = await file.arrayBuffer();
  await saveUpload(target, bytes);
  return jsonResponse({ id: filename.slice(0, -extension.length), extension });
};

const mimeByExt: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const guessMimeType = (extension: string): string =>
  mimeByExt[extension] ?? "application/octet-stream";

const resolveImageTarget = (
  ctx: RouteContext,
  id: string,
  extension: string
): { target: string } | { error: string } => {
  if (!isValidUuid(id)) return { error: "invalid id" };
  try {
    assertWhitelistedExtension(`x${extension}`);
  } catch (error) {
    return { error: (error as Error).message };
  }
  const target = uploadPath(ctx.meta, `${id}${extension}`);
  try {
    assertNoTraversal(uploadsRoot, target);
  } catch {
    return { error: "invalid path" };
  }
  return { target };
};

const imageRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const extension = url.searchParams.get("ext") ?? ".png";
  const resolved = resolveImageTarget(ctx, id, extension);
  if ("error" in resolved) return badRequest(resolved.error);
  const bytes = await loadUpload(resolved.target);
  if (bytes === null) return new Response("Not Found", { status: 404 });
  const body = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": guessMimeType(extension) },
  });
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
  "POST /api/upload": (req, ctx) => uploadRoute(req, ctx),
  "GET /api/image": (req, ctx) => imageRoute(req, ctx),
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
