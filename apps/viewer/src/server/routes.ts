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
  saveRevision,
  saveUpload,
  uploadPath,
  agentUploadsRoot,
  type PlanMeta,
} from "./storage.ts";
import {
  assertNoTraversal,
  assertWhitelistedExtension,
  isValidUuid,
  mintUuidFilename,
} from "./uploadSecurity.ts";

/**
 * Outcome of the reviewer's interaction with a plan. `draft` is draft mode's
 * "Send to agent": `path`/`version` locate the persisted revision the coding
 * agent reads next. An approve issued from draft mode carries the `path` of
 * the final persisted body; plan-mode approves omit it.
 */
export type Decision =
  | { kind: "approve"; path?: string }
  | { kind: "deny"; feedback: string }
  | { kind: "feedback"; feedback: string }
  | { kind: "draft"; path: string; version: number };

interface RouteContext {
  plan: string;
  meta: PlanMeta;
  /** Per-agent storage namespace; never serialized to the client. */
  agentId: string;
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
  const versions = await listVersions(ctx.agentId, ctx.meta);
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
    const plan = await loadPlan(ctx.agentId, meta);
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
      loadPlan(ctx.agentId, { ...ctx.meta, version: input.from }),
      loadPlan(ctx.agentId, { ...ctx.meta, version: input.to }),
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
  return spawnVscodeDiff(
    planFilePath(ctx.agentId, ctx.meta, input.from),
    planFilePath(ctx.agentId, ctx.meta, input.to)
  );
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
  await clearDraft(ctx.agentId, ctx.meta).catch(() => undefined);
  ctx.markResolved();
  if (ctx.decisionFile !== undefined && ctx.decisionFile !== null) {
    await recordDecision(ctx.decisionFile, decision);
  }
  ctx.resolve(decision);
};

/**
 * Persist an edited document body as the next plan version under the session's
 * `{project, slug}` (never re-derived — session meta owns continuity). A body
 * byte-identical to the boot plan reuses the boot version instead of writing a
 * no-op revision. A write failure (EACCES/ENOSPC) returns a 500 Response
 * WITHOUT resolving the session, so the one-shot server stays retryable.
 */
const persistRevision = async (
  ctx: RouteContext,
  markdown: string
): Promise<{ version: number; path: string } | Response> => {
  if (markdown === ctx.plan) {
    return {
      version: ctx.meta.version,
      path: planFilePath(ctx.agentId, ctx.meta, ctx.meta.version),
    };
  }
  try {
    return await saveRevision(ctx.agentId, ctx.meta, markdown);
  } catch (error) {
    return jsonResponse({ reason: "write-failed", message: errorMessage(error) }, 500);
  }
};

/**
 * A `markdown` key that is present but empty/whitespace is distinguished from
 * an absent body: draft-mode clients always send the field, so an emptied
 * document must 400 (matching `draftSendRoute`) instead of silently degrading
 * an Approve into a path-less plan-mode approve.
 */
type MarkdownBody =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "present"; markdown: string };

const parseMarkdownBody = async (req: Request): Promise<MarkdownBody> => {
  const body = (await req.json().catch(() => null)) as { markdown?: unknown } | null;
  if (body === null || !("markdown" in body)) return { kind: "absent" };
  const { markdown } = body;
  return typeof markdown === "string" && markdown.trim().length > 0
    ? { kind: "present", markdown }
    : { kind: "invalid" };
};

// NOTE: approve/deny/feedback/draft-send stay repeatable after resolution
// (no isResolved guard): the BDD harness drives many scenarios against one
// keep-alive viewer, and the production one-shot flow stops the server after
// the first resolution anyway. Double-click protection lives client-side
// (the `busy` phase disables the actions).
const approveRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = await parseMarkdownBody(req);
  if (body.kind === "invalid") return badRequest("missing markdown");
  if (body.kind === "absent") {
    await finalize(ctx, { kind: "approve" });
    return new Response(null, { status: 204 });
  }
  const persisted = await persistRevision(ctx, body.markdown);
  if (persisted instanceof Response) return persisted;
  await finalize(ctx, { kind: "approve", path: persisted.path });
  return new Response(null, { status: 204 });
};

const draftSendRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = await parseMarkdownBody(req);
  if (body.kind !== "present") return badRequest("missing markdown");
  const persisted = await persistRevision(ctx, body.markdown);
  if (persisted instanceof Response) return persisted;
  await finalize(ctx, { kind: "draft", path: persisted.path, version: persisted.version });
  return new Response(null, { status: 204 });
};

const denyRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as { feedback?: string } | null;
  const feedback = rewriteImageRefs(ctx.agentId, body?.feedback ?? "", ctx.meta);
  await finalize(ctx, { kind: "deny", feedback });
  return new Response(null, { status: 204 });
};

const draftGetRoute = async (ctx: RouteContext): Promise<Response> => {
  const raw = await loadDraft(ctx.agentId, ctx.meta);
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
  await saveDraft(ctx.agentId, ctx.meta, raw);
  return new Response(null, { status: 204 });
};

const draftDeleteRoute = async (ctx: RouteContext): Promise<Response> => {
  await clearDraft(ctx.agentId, ctx.meta);
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
  const target = uploadPath(ctx.agentId, ctx.meta, filename);
  try {
    assertNoTraversal(agentUploadsRoot(ctx.agentId), target);
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
  const target = uploadPath(ctx.agentId, ctx.meta, `${id}${extension}`);
  try {
    assertNoTraversal(agentUploadsRoot(ctx.agentId), target);
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
  // See staticAssets.ts: bun-types' Buffer/Uint8Array don't unify with
  // Bun's Response body type across all our tsconfigs. Cast via
  // ConstructorParameters avoids the BodyInit name (not always in scope).
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return new Response(bytes as unknown as ConstructorParameters<typeof Response>[0], {
    status: 200,
    headers: { "Content-Type": guessMimeType(extension) },
  });
};

const imageRefRe = /!\[\]\(([^)]+)\)/g;

const tryAbsoluteUploadPath = (agentId: string, meta: PlanMeta, ref: string): string | null => {
  const dot = ref.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = ref.slice(0, dot);
  if (!isValidUuid(id)) return null;
  try {
    assertWhitelistedExtension(ref);
  } catch {
    return null;
  }
  const target = uploadPath(agentId, meta, ref);
  try {
    assertNoTraversal(agentUploadsRoot(agentId), target);
  } catch {
    return null;
  }
  return target;
};

const rewriteImageRefs = (agentId: string, markdown: string, meta: PlanMeta): string =>
  markdown.replaceAll(imageRefRe, (match, ref: string) => {
    const absolute = tryAbsoluteUploadPath(agentId, meta, ref);
    return absolute === null ? match : `![](${absolute})`;
  });

const feedbackRoute = async (req: Request, ctx: RouteContext): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as { feedback?: string } | null;
  const feedback = rewriteImageRefs(ctx.agentId, body?.feedback ?? "", ctx.meta);
  await saveFeedback(ctx.agentId, ctx.meta, feedback);
  await finalize(ctx, { kind: "feedback", feedback });
  return new Response(null, { status: 204 });
};

type Handler = (req: Request, ctx: RouteContext) => Response | Promise<Response>;

const routes: Record<string, Handler> = {
  [routeKey("plan")]: (_req, ctx) => planRoute(ctx),
  [routeKey("planVersions")]: (_req, ctx) => planVersionsRoute(ctx),
  [routeKey("planVersion")]: (req, ctx) => planVersionRoute(req, ctx),
  [routeKey("planVscodeDiff")]: (req, ctx) => planVscodeDiffRoute(req, ctx),
  [routeKey("approve")]: (req, ctx) => approveRoute(req, ctx),
  [routeKey("deny")]: (req, ctx) => denyRoute(req, ctx),
  [routeKey("feedback")]: (req, ctx) => feedbackRoute(req, ctx),
  [routeKey("draftGet")]: (_req, ctx) => draftGetRoute(ctx),
  [routeKey("draftPut")]: (req, ctx) => draftPostRoute(req, ctx),
  [routeKey("draftDelete")]: (_req, ctx) => draftDeleteRoute(ctx),
  [routeKey("draftSend")]: (req, ctx) => draftSendRoute(req, ctx),
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
