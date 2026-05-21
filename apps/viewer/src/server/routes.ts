import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

import { routeKey } from "../shared/apiRoutes.ts";
import type { ViewerMode } from "../shared/apiTypes.ts";

import {
  clearDraft,
  listVersions,
  loadDraft,
  loadPlan,
  loadUpload,
  planFilePath,
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
  /** Flips to true once a decision has been recorded. Subsequent draft writes are rejected. */
  isResolved: () => boolean;
  /** Mark this context as resolved. Called by approve/deny/feedback after `resolve`. */
  markResolved: () => void;
  /** When set, the most recent decision is persisted here for out-of-band readers (e.g. Playwright). */
  decisionFile?: string | null;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

const planVersionsRoute = async (ctx: RouteContext): Promise<Response> => {
  const versions = await listVersions(ctx.meta);
  return jsonResponse({ versions, current: ctx.meta.version });
};

const versionParamPattern = /^[1-9]\d*$/;

const parseVersionParam = (raw: string | null): number | null => {
  if (raw === null || !versionParamPattern.test(raw)) return null;
  return Number.parseInt(raw, 10);
};

const parseVersionNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return null;
  return value;
};

const planVersionRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const url = new URL(req.url);
  const n = parseVersionParam(url.searchParams.get("n"));
  if (n === null) return badRequest("invalid version");
  try {
    const meta = { ...ctx.meta, version: n };
    const plan = await loadPlan(meta);
    return jsonResponse({ plan, meta });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not Found", { status: 404 });
    }
    throw error;
  }
};

/**
 * Spawn `code --diff <from> <to>` against two persisted versions. Plannotator-
 * compatible endpoint for VS Code / Obsidian integrations. Detached + unref so
 * the viewer process stays independent of the external editor's lifetime.
 *
 * Response codes:
 * - 204 — spawn issued, VS Code is opening the diff
 * - 400 — invalid body or unknown version numbers
 * - 404 — at least one of the requested version files is missing on disk
 * - 503 — `code` is not installed on PATH; body `{ reason: "code-cli-missing" }`
 */
interface VscodeDiffInput {
  from: number;
  to: number;
}

const parseVscodeDiffBody = async (req: Request): Promise<VscodeDiffInput | null> => {
  const body = (await req.json().catch(() => null)) as { from?: unknown; to?: unknown } | null;
  if (body === null) return null;
  const from = parseVersionNumber(body.from);
  const to = parseVersionNumber(body.to);
  if (from === null || to === null) return null;
  return { from, to };
};

const assertVersionsExist = async (
  ctx: RouteContext,
  input: VscodeDiffInput
): Promise<Response | null> => {
  try {
    await Promise.all([
      loadPlan({ ...ctx.meta, version: input.from }),
      loadPlan({ ...ctx.meta, version: input.to }),
    ]);
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not Found", { status: 404 });
    }
    throw error;
  }
};

const planVscodeDiffRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const input = await parseVscodeDiffBody(req);
  if (input === null) return badRequest("invalid version");
  const missing = await assertVersionsExist(ctx, input);
  if (missing !== null) return missing;
  return spawnVscodeDiff(planFilePath(ctx.meta, input.from), planFilePath(ctx.meta, input.to));
};

const spawnVscodeDiff = (fromPath: string, toPath: string): Promise<Response> =>
  new Promise((resolve) => {
    const child = spawn("code", ["--diff", fromPath, toPath], {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        resolve(jsonResponse({ reason: "code-cli-missing" }, 503));
        return;
      }
      resolve(jsonResponse({ reason: "spawn-failed", message: error.message }, 500));
    });
    child.once("spawn", () => {
      child.unref();
      resolve(new Response(null, { status: 204 }));
    });
  });

/**
 * Finalize a submission: clear the draft, mark the context resolved so any
 * straggling POST /api/draft becomes a no-op, persist the decision for
 * out-of-band readers, and resolve the runOneShot promise.
 *
 * Order matters: clearDraft + markResolved happen BEFORE resolve so that even
 * if the runOneShot tear-down (which calls server.stop) runs immediately on
 * the next microtask, the draft state is already canonical.
 */
const finalize = async (ctx: RouteContext, decision: Decision): Promise<void> => {
  await clearDraft(ctx.meta).catch(() => undefined);
  ctx.markResolved();
  if (ctx.decisionFile !== undefined && ctx.decisionFile !== null) {
    await recordDecision(ctx.decisionFile, decision);
  }
  ctx.resolve(decision);
};

const approveRoute = async (ctx: RouteContext): Promise<Response> => {
  await finalize(ctx, { kind: "approve" });
  return new Response(null, { status: 204 });
};

const denyRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as { feedback?: string } | null;
  const feedback = body?.feedback ?? "";
  await finalize(ctx, { kind: "deny", feedback });
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
  // After a decision has been resolved, late saves from a queued client-side
  // debounce would re-create the draft on disk and resurrect annotations on
  // the next session for the same plan slug. Drop them silently.
  if (ctx.isResolved()) return new Response(null, { status: 204 });
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
    return badRequest(errorMessage(error));
  }
  const filename = mintUuidFilename(extension);
  const target = uploadPath(ctx.meta, filename);
  try {
    assertNoTraversal(uploadsRoot, target);
  } catch (error) {
    return badRequest(errorMessage(error));
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
    return { error: errorMessage(error) };
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
  await finalize(ctx, { kind: "feedback", feedback });
  return new Response(null, { status: 204 });
};

type Handler = (req: Request, ctx: RouteContext) => Response | Promise<Response>;

const routes: Record<string, Handler> = {
  [routeKey("plan")]: (_req, ctx) => planRoute(ctx),
  [routeKey("planVersions")]: (_req, ctx) => planVersionsRoute(ctx),
  [routeKey("planVersion")]: (req, ctx) => planVersionRoute(req, ctx),
  [routeKey("planVscodeDiff")]: (req, ctx) => planVscodeDiffRoute(req, ctx),
  [routeKey("approve")]: (_req, ctx) => approveRoute(ctx),
  [routeKey("deny")]: (req, ctx) => denyRoute(req, ctx),
  [routeKey("feedback")]: (req, ctx) => feedbackRoute(req, ctx),
  [routeKey("draftGet")]: (_req, ctx) => draftGetRoute(ctx),
  [routeKey("draftPut")]: (req, ctx) => draftPostRoute(req, ctx),
  [routeKey("draftDelete")]: (_req, ctx) => draftDeleteRoute(ctx),
  [routeKey("upload")]: (req, ctx) => uploadRoute(req, ctx),
  [routeKey("image")]: (req, ctx) => imageRoute(req, ctx),
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
