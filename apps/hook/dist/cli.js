#!/usr/bin/env bun
// @bun

// src/installHook.ts
import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
var settingsPath = join(homedir(), ".claude", "settings.json");
var isSymbiotEntry = (command) => /apps\/hook\/(src|dist)\/cli\.(ts|js).*run-hook/.test(command) || command === "symbiot run-hook";
var cliCommand = () => {
  const here = fileURLToPath(import.meta.url);
  const srcCli = resolve(dirname(here), "cli.ts");
  return `bun ${srcCli} run-hook`;
};
var stripSymbiotEntries = (groups) => groups.map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isSymbiotEntry(h.command)) })).filter((g) => g.hooks.length > 0);
var ensureHook = (settings, command) => {
  const hooks = settings.hooks ?? {};
  const existing = stripSymbiotEntries(hooks.Stop ?? []);
  const preExisting = stripSymbiotEntries(hooks.PreToolUse ?? []);
  const permExisting = stripSymbiotEntries(hooks.PermissionRequest ?? []);
  const symbiotGroup = {
    matcher: "ExitPlanMode",
    hooks: [{ type: "command", command }]
  };
  return {
    ...settings,
    hooks: {
      ...hooks,
      Stop: existing,
      PreToolUse: [...preExisting, symbiotGroup],
      PermissionRequest: [...permExisting, symbiotGroup]
    }
  };
};
var readSettings = async () => {
  try {
    return JSON.parse(await readFile(settingsPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT")
      return {};
    throw error;
  }
};
var installHook = async () => {
  const command = cliCommand();
  const current = await readSettings();
  const next = ensureHook(current, command);
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}
`, "utf8");
  return { path: settingsPath, command };
};
var stripAllSymbiot = (settings) => {
  const hooks = settings.hooks ?? {};
  let removed = 0;
  const cleanedEntries = Object.entries(hooks).map(([event, groups]) => {
    const before = groups.flatMap((g) => g.hooks).length;
    const cleaned = stripSymbiotEntries(groups);
    removed += before - cleaned.flatMap((g) => g.hooks).length;
    return [event, cleaned];
  });
  return {
    next: { ...settings, hooks: Object.fromEntries(cleanedEntries) },
    removed
  };
};
var uninstallHook = async () => {
  const current = await readSettings();
  const { next, removed } = stripAllSymbiot(current);
  if (removed === 0)
    return { path: settingsPath, removed };
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}
`, "utf8");
  return { path: settingsPath, removed };
};

// src/runAnnotate.ts
import { readFile as readFile4 } from "fs/promises";

// ../viewer/src/server/startServer.ts
import { dirname as dirname3, join as join4 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// ../viewer/src/server/cors.ts
var corsHeaders = (origin, expectedOrigin) => {
  const allowed = origin === expectedOrigin ? expectedOrigin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
};
var isOriginAllowed = (origin, expectedOrigin) => origin === null || origin === expectedOrigin;

// ../viewer/src/server/routes.ts
import { spawn } from "child_process";
import { writeFile as writeFile3 } from "fs/promises";

// ../viewer/src/shared/apiRoutes.ts
var apiRoutes = {
  plan: { method: "GET", path: "/api/plan" },
  planVersions: { method: "GET", path: "/api/plan/versions" },
  planVersion: { method: "GET", path: "/api/plan/version" },
  planVscodeDiff: { method: "POST", path: "/api/plan/vscode-diff" },
  approve: { method: "POST", path: "/api/approve" },
  deny: { method: "POST", path: "/api/deny" },
  feedback: { method: "POST", path: "/api/feedback" },
  draftGet: { method: "GET", path: "/api/draft" },
  draftPut: { method: "POST", path: "/api/draft" },
  draftDelete: { method: "DELETE", path: "/api/draft" },
  upload: { method: "POST", path: "/api/upload" },
  image: { method: "GET", path: "/api/image" }
};
var routeKey = (id) => `${apiRoutes[id].method} ${apiRoutes[id].path}`;

// ../viewer/src/server/storage.ts
import { mkdir as mkdir2, readdir, readFile as readFile2, rename, rm, writeFile as writeFile2 } from "fs/promises";
import { homedir as homedir2 } from "os";
import { basename, dirname as dirname2, join as join2 } from "path";
import { randomUUID } from "crypto";
var getStorageRoot = () => join2(process.env.HOME || homedir2(), ".symbiot");
var storageRoot = getStorageRoot();
var historyDir = () => join2(getStorageRoot(), "history");
var annotationsDir = () => join2(getStorageRoot(), "annotations");
var draftsDir = () => join2(getStorageRoot(), "drafts");
var uploadsDir = () => join2(getStorageRoot(), "uploads");
var uploadsRoot = uploadsDir();
var slugReplaceRe = /[^a-z0-9]+/g;
var slugTrimRe = /^-+|-+$/g;
var slugify = (input) => {
  const lower = input.trim().toLowerCase().replaceAll(slugReplaceRe, "-").replace(slugTrimRe, "");
  return lower.length > 0 ? lower.slice(0, 64) : "untitled";
};
var firstHeading = (markdown) => {
  for (const line of markdown.split(`
`)) {
    const match = /^#{1,6}\s+(.+)$/.exec(line);
    if (match?.[1])
      return match[1];
  }
  return null;
};
var deriveProjectSlug = (cwd) => slugify(basename(cwd));
var derivePlanSlug = (plan) => slugify(firstHeading(plan) ?? "untitled-plan");
var padVersion = (n) => String(n).padStart(3, "0");
var planDir = (project, slug) => join2(historyDir(), project, slug);
var planFile = (project, slug, version) => join2(planDir(project, slug), `${padVersion(version)}.md`);
var writeAtomic = async (target, content) => {
  await mkdir2(dirname2(target), { recursive: true });
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile2(tmp, content, typeof content === "string" ? "utf8" : undefined);
  await rename(tmp, target);
};
var nextVersionIn = async (dir) => {
  try {
    const entries = await readdir(dir);
    const versions = entries.map((name) => /^(\d{3})\.md$/.exec(name)?.[1]).filter((v) => v !== undefined).map((v) => Number.parseInt(v, 10));
    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  } catch (error) {
    if (error.code === "ENOENT")
      return 1;
    throw error;
  }
};
var savePlan = async (plan, cwd = process.cwd()) => {
  const project = deriveProjectSlug(cwd);
  const slug = derivePlanSlug(plan);
  const version = await nextVersionIn(planDir(project, slug));
  await writeAtomic(planFile(project, slug, version), plan);
  return { project, slug, version };
};
var loadPlan = async (meta) => readFile2(planFile(meta.project, meta.slug, meta.version), "utf8");
var planFilePath = (meta, version) => planFile(meta.project, meta.slug, version);
var listVersions = async (meta) => {
  try {
    const entries = await readdir(planDir(meta.project, meta.slug));
    return entries.map((name) => /^(\d{3})\.md$/.exec(name)?.[1]).filter((v) => v !== undefined).map((v) => Number.parseInt(v, 10)).sort((a, b) => a - b);
  } catch (error) {
    if (error.code === "ENOENT")
      return [];
    throw error;
  }
};
var annotationDir = (project, slug) => join2(annotationsDir(), project, slug);
var annotationFile = (project, slug, version) => join2(annotationDir(project, slug), `${padVersion(version)}.md`);
var saveFeedback = async (meta, feedback) => {
  const version = await nextVersionIn(annotationDir(meta.project, meta.slug));
  await writeAtomic(annotationFile(meta.project, meta.slug, version), feedback);
  return { version };
};
var draftFile = (project, slug) => join2(draftsDir(), project, slug, "draft.json");
var saveDraft = async (meta, draft) => {
  await writeAtomic(draftFile(meta.project, meta.slug), draft);
};
var loadDraft = async (meta) => {
  try {
    return await readFile2(draftFile(meta.project, meta.slug), "utf8");
  } catch (error) {
    if (error.code === "ENOENT")
      return null;
    throw error;
  }
};
var clearDraft = async (meta) => {
  await rm(draftFile(meta.project, meta.slug), { force: true });
};
var uploadDir = (project, slug) => join2(uploadsDir(), project, slug);
var uploadPath = (meta, filename) => join2(uploadDir(meta.project, meta.slug), filename);
var saveUpload = async (target, bytes) => {
  await writeAtomic(target, new Uint8Array(bytes));
};
var loadUpload = async (target) => {
  try {
    return await readFile2(target);
  } catch (error) {
    if (error.code === "ENOENT")
      return null;
    throw error;
  }
};

// ../viewer/src/server/uploadSecurity.ts
import { randomUUID as randomUUID2 } from "crypto";
import { resolve as resolve2 } from "path";
var allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
var uuidV4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var traversalSegments = new Set(["..", ""]);
var assertWhitelistedExtension = (filename) => {
  const lower = filename.toLowerCase();
  const found = allowedExtensions.find((ext) => lower.endsWith(ext));
  if (found === undefined)
    throw new Error(`extension not allowed: ${filename}`);
  return found;
};
var segmentsAreSafe = (rel) => {
  for (const segment of rel.split("/")) {
    if (traversalSegments.has(segment))
      return false;
  }
  return true;
};
var assertNoTraversal = (uploadsRoot2, target) => {
  if (target.includes("\x00"))
    throw new Error("null byte in path");
  const resolved = resolve2(target);
  const root = resolve2(uploadsRoot2);
  if (!resolved.startsWith(`${root}/`) && resolved !== root) {
    throw new Error(`path escapes uploads root: ${target}`);
  }
  if (!segmentsAreSafe(resolved.slice(root.length + 1))) {
    throw new Error(`bad path segment in: ${target}`);
  }
};
var mintUuidFilename = (extension) => `${randomUUID2()}${extension}`;
var isValidUuid = (id) => uuidV4Re.test(id);

// ../viewer/src/server/routes.ts
var errorMessage = (error) => error instanceof Error ? error.message : String(error);
var recordDecision = async (path, decision) => {
  const payload = JSON.stringify({ ...decision, at: Date.now() });
  await writeFile3(path, payload, "utf8");
};
var jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8" }
});
var planRoute = (ctx) => jsonResponse({ plan: ctx.plan, mode: ctx.mode, meta: ctx.meta });
var planVersionsRoute = async (ctx) => {
  const versions = await listVersions(ctx.meta);
  return jsonResponse({ versions, current: ctx.meta.version });
};
var versionParamPattern = /^[1-9]\d*$/;
var parseVersionParam = (raw) => {
  if (raw === null || !versionParamPattern.test(raw))
    return null;
  return Number.parseInt(raw, 10);
};
var parseVersionNumber = (value) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    return null;
  return value;
};
var planVersionRoute = async (req, ctx) => {
  const url = new URL(req.url);
  const n = parseVersionParam(url.searchParams.get("n"));
  if (n === null)
    return badRequest("invalid version");
  try {
    const meta = { ...ctx.meta, version: n };
    const plan = await loadPlan(meta);
    return jsonResponse({ plan, meta });
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Response("Not Found", { status: 404 });
    }
    throw error;
  }
};
var parseVscodeDiffBody = async (req) => {
  const body = await req.json().catch(() => null);
  if (body === null)
    return null;
  const from = parseVersionNumber(body.from);
  const to = parseVersionNumber(body.to);
  if (from === null || to === null)
    return null;
  return { from, to };
};
var assertVersionsExist = async (ctx, input) => {
  try {
    await Promise.all([
      loadPlan({ ...ctx.meta, version: input.from }),
      loadPlan({ ...ctx.meta, version: input.to })
    ]);
    return null;
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Response("Not Found", { status: 404 });
    }
    throw error;
  }
};
var planVscodeDiffRoute = async (req, ctx) => {
  const input = await parseVscodeDiffBody(req);
  if (input === null)
    return badRequest("invalid version");
  const missing = await assertVersionsExist(ctx, input);
  if (missing !== null)
    return missing;
  return spawnVscodeDiff(planFilePath(ctx.meta, input.from), planFilePath(ctx.meta, input.to));
};
var spawnVscodeDiff = (fromPath, toPath) => new Promise((resolve3) => {
  const child = spawn("code", ["--diff", fromPath, toPath], {
    detached: true,
    stdio: "ignore"
  });
  child.once("error", (error) => {
    if (error.code === "ENOENT") {
      resolve3(jsonResponse({ reason: "code-cli-missing" }, 503));
      return;
    }
    resolve3(jsonResponse({ reason: "spawn-failed", message: error.message }, 500));
  });
  child.once("spawn", () => {
    child.unref();
    resolve3(new Response(null, { status: 204 }));
  });
});
var finalize = async (ctx, decision) => {
  await clearDraft(ctx.meta).catch(() => {
    return;
  });
  ctx.markResolved();
  if (ctx.decisionFile !== undefined && ctx.decisionFile !== null) {
    await recordDecision(ctx.decisionFile, decision);
  }
  ctx.resolve(decision);
};
var approveRoute = async (ctx) => {
  await finalize(ctx, { kind: "approve" });
  return new Response(null, { status: 204 });
};
var denyRoute = async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const feedback = body?.feedback ?? "";
  await finalize(ctx, { kind: "deny", feedback });
  return new Response(null, { status: 204 });
};
var draftGetRoute = async (ctx) => {
  const raw = await loadDraft(ctx.meta);
  if (raw === null)
    return new Response(null, { status: 204 });
  return new Response(raw, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
};
var draftPostRoute = async (req, ctx) => {
  if (ctx.isResolved())
    return new Response(null, { status: 204 });
  const raw = await req.text();
  await saveDraft(ctx.meta, raw);
  return new Response(null, { status: 204 });
};
var draftDeleteRoute = async (ctx) => {
  await clearDraft(ctx.meta);
  return new Response(null, { status: 204 });
};
var badRequest = (message) => new Response(message, { status: 400, headers: { "Content-Type": "text/plain" } });
var uploadRoute = async (req, ctx) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return badRequest("missing 'file' part");
  let extension;
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
var mimeByExt = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};
var guessMimeType = (extension) => mimeByExt[extension] ?? "application/octet-stream";
var resolveImageTarget = (ctx, id, extension) => {
  if (!isValidUuid(id))
    return { error: "invalid id" };
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
var imageRoute = async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const extension = url.searchParams.get("ext") ?? ".png";
  const resolved = resolveImageTarget(ctx, id, extension);
  if ("error" in resolved)
    return badRequest(resolved.error);
  const bytes = await loadUpload(resolved.target);
  if (bytes === null)
    return new Response("Not Found", { status: 404 });
  const body = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": guessMimeType(extension) }
  });
};
var feedbackRoute = async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const feedback = body?.feedback ?? "";
  await saveFeedback(ctx.meta, feedback);
  await finalize(ctx, { kind: "feedback", feedback });
  return new Response(null, { status: 204 });
};
var routes = {
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
  [routeKey("image")]: (req, ctx) => imageRoute(req, ctx)
};
var handleApi = async (req, url, ctx) => {
  const handler = routes[`${req.method} ${url.pathname}`];
  if (handler !== undefined)
    return handler(req, ctx);
  if (url.pathname.startsWith("/api/"))
    return new Response("Not Found", { status: 404 });
  return null;
};

// ../viewer/src/server/openBrowser.ts
import { spawn as spawn2 } from "child_process";
var platformOpener = () => {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: [] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", '""'] };
    default:
      return { command: "xdg-open", args: [] };
  }
};
var openBrowser = (url) => {
  const { command, args } = platformOpener();
  const child = spawn2(command, [...args, url], { detached: true, stdio: "ignore" });
  child.unref();
};

// ../viewer/src/server/staticAssets.ts
import { readFile as readFile3 } from "fs/promises";
import { extname, join as join3, normalize, resolve as resolve3 } from "path";
var mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};
var contentType = (path) => mimeTypes[extname(path)] ?? "application/octet-stream";
var safeJoin = (root, requestPath) => {
  const target = resolve3(root, `.${normalize(requestPath)}`);
  return target.startsWith(`${resolve3(root)}/`) || target === resolve3(root) ? target : null;
};
var readOr = async (path) => {
  try {
    return await readFile3(path);
  } catch {
    return null;
  }
};
var serveStatic = async (rootDir, requestPath) => {
  const target = safeJoin(rootDir, requestPath === "/" ? "/index.html" : requestPath);
  if (target === null)
    return new Response("Forbidden", { status: 403 });
  const body = await readOr(target) ?? await readOr(join3(rootDir, "index.html"));
  if (body === null)
    return null;
  return new Response(body, { headers: { "Content-Type": contentType(target) } });
};

// ../viewer/src/server/startServer.ts
var defaultStaticRoot = join4(dirname3(fileURLToPath2(import.meta.url)), "..", "..", "dist", "client");
var buildResponse = async (req, ctx) => {
  const url = new URL(req.url);
  const apiResponse = await handleApi(req, url, ctx);
  if (apiResponse !== null)
    return apiResponse;
  const staticResponse = await serveStatic(ctx.staticRoot, url.pathname);
  return staticResponse ?? new Response("Not Found", { status: 404 });
};
var withCors = (res, headers) => {
  const merged = new Headers(res.headers);
  for (const [k, v] of Object.entries(headers))
    merged.set(k, v);
  return new Response(res.body, { status: res.status, headers: merged });
};
var preflight = (origin, expected) => new Response(null, { status: 204, headers: corsHeaders(origin, expected) });
var handle = async (req, ctx) => {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin, ctx.origin))
    return new Response("Forbidden", { status: 403 });
  if (req.method === "OPTIONS")
    return preflight(origin, ctx.origin);
  const response = await buildResponse(req, ctx);
  return withCors(response, corsHeaders(origin, ctx.origin));
};
var startServer = async (options) => {
  const meta = await savePlan(options.plan, options.cwd);
  let resolve4;
  const resolved = new Promise((r) => {
    resolve4 = r;
  });
  let resolvedFlag = false;
  const isResolved = () => resolvedFlag;
  const markResolved = () => {
    resolvedFlag = true;
  };
  const staticRoot = options.staticRoot ?? defaultStaticRoot;
  let port = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: options.port ?? 0,
    fetch: (req) => handle(req, {
      plan: options.plan,
      meta,
      mode: options.mode ?? "plan",
      resolve: resolve4,
      isResolved,
      markResolved,
      origin: `http://127.0.0.1:${port}`,
      staticRoot,
      decisionFile: options.decisionFile ?? null
    })
  });
  port = server.port ?? 0;
  const url = `http://127.0.0.1:${port}/`;
  if (options.openInBrowser !== false)
    openBrowser(url);
  return {
    url,
    meta,
    resolved,
    stop: async () => {
      await server.stop();
    }
  };
};

// src/bundledStaticRoot.ts
import { access } from "fs/promises";
import { dirname as dirname4, join as join5 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var bundledStaticRoot = async (entryUrl) => {
  const candidate = join5(dirname4(fileURLToPath3(entryUrl)), "client");
  try {
    await access(candidate);
    return candidate;
  } catch {
    return;
  }
};

// src/runAnnotate.ts
var runAnnotate = async (filePath) => {
  if (filePath === undefined) {
    process.stderr.write(`usage: symbiot annotate <file.md>
`);
    return 64;
  }
  const plan = await readFile4(filePath, "utf8");
  const server = await startServer({
    plan,
    mode: "annotate",
    staticRoot: await bundledStaticRoot(import.meta.url)
  });
  process.stderr.write(`symbiot: annotate ${filePath} at ${server.url}
`);
  const decision = await server.resolved;
  await server.stop();
  if (decision.kind === "feedback") {
    process.stdout.write(`${decision.feedback}
`);
    return 0;
  }
  return 1;
};

// src/runHook.ts
import { createHash, randomUUID as randomUUID3 } from "crypto";
import { appendFile, mkdir as mkdir3, readFile as readFile5, rename as rename2, writeFile as writeFile4 } from "fs/promises";
import { homedir as homedir3 } from "os";
import { dirname as dirname5, join as join6 } from "path";
var approveMarkerTtlMs = 60000;
var markerPath = () => join6(homedir3(), ".symbiot", "hook-state", "last-approve.json");
var eventLogPath = () => join6(homedir3(), ".symbiot", "hook-state", "events.log");
var isMissingPath = (error) => {
  const { code } = error;
  return code === "ENOENT" || code === "ENOTDIR";
};
var logEvent = async (entry) => {
  try {
    const target = eventLogPath();
    await mkdir3(dirname5(target), { recursive: true });
    await appendFile(target, `${JSON.stringify({ at: Date.now(), ...entry })}
`, "utf8");
  } catch (error) {
    if (isMissingPath(error))
      return;
    const code = error.code ?? "unknown";
    process.stderr.write(`symbiot: events.log write failed (${code})
`);
  }
};
var hashPlan = (plan) => createHash("sha256").update(plan).digest("hex");
var readHookInput = async () => {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  if (chunks.length === 0)
    return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};
var planFrom = (input) => {
  if (input.tool_name !== "ExitPlanMode")
    return null;
  return input.tool_input?.plan ?? null;
};
var writeApproveMarker = async (planHash) => {
  const target = markerPath();
  await mkdir3(dirname5(target), { recursive: true });
  const payload = { planHash, approvedAt: Date.now() };
  const tmp = `${target}.${randomUUID3()}.tmp`;
  await writeFile4(tmp, JSON.stringify(payload), "utf8");
  await rename2(tmp, target);
};
var isPlanHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
var isApprovedAt = (value) => typeof value === "number" && Number.isFinite(value);
var isApproveMarker = (value) => {
  if (typeof value !== "object" || value === null)
    return false;
  const { planHash, approvedAt } = value;
  return isPlanHash(planHash) && isApprovedAt(approvedAt);
};
var readApproveMarker = async () => {
  try {
    const raw = await readFile5(markerPath(), "utf8");
    const parsed = JSON.parse(raw);
    return isApproveMarker(parsed) ? parsed : null;
  } catch (error) {
    if (!isMissingPath(error)) {
      const code = error.code ?? "parse";
      process.stderr.write(`symbiot: marker read failed (${code})
`);
    }
    return null;
  }
};
var isFreshFor = (marker, planHash, now) => marker.planHash === planHash && now - marker.approvedAt < approveMarkerTtlMs;
var emitApproveDecision = () => {
  const payload = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Reviewer approved plan in symbiot."
    }
  };
  process.stdout.write(JSON.stringify(payload));
};
var emitDenyDecision = (feedback) => {
  const payload = {
    decision: "block",
    reason: feedback.length > 0 ? feedback : "Reviewer requested changes."
  };
  process.stdout.write(JSON.stringify(payload));
};
var emitPermissionRequestAllow = () => {
  const payload = {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" }
    }
  };
  process.stdout.write(JSON.stringify(payload));
};
var runPreToolUse = async (plan) => {
  const planHash = hashPlan(plan);
  const server = await startServer({ plan, staticRoot: await bundledStaticRoot(import.meta.url) });
  process.stderr.write(`symbiot: review plan at ${server.url}
`);
  const decision = await server.resolved;
  await server.stop();
  if (decision.kind === "approve") {
    await writeApproveMarker(planHash);
    emitApproveDecision();
    await logEvent({ event: "PreToolUse", planHash, emitted: "allow" });
    return 0;
  }
  emitDenyDecision(decision.feedback);
  await logEvent({ event: "PreToolUse", planHash, emitted: "block" });
  return 0;
};
var runPermissionRequest = async (plan) => {
  const planHash = hashPlan(plan);
  const marker = await readApproveMarker();
  const fresh = marker !== null && isFreshFor(marker, planHash, Date.now());
  if (fresh) {
    emitPermissionRequestAllow();
    await logEvent({ event: "PermissionRequest", planHash, marker, emitted: "allow" });
    return 0;
  }
  await logEvent({ event: "PermissionRequest", planHash, marker, emitted: "passthrough" });
  return 0;
};
var runHook = async () => {
  const input = await readHookInput();
  await logEvent({
    event: "invoked",
    hook_event_name: input.hook_event_name,
    tool_name: input.tool_name,
    hasPlan: typeof input.tool_input?.plan === "string"
  });
  const plan = planFrom(input);
  if (plan === null)
    return 0;
  if (input.hook_event_name === "PermissionRequest") {
    return runPermissionRequest(plan);
  }
  return runPreToolUse(plan);
};

// src/cli.ts
var usage = () => {
  process.stderr.write(`usage: symbiot <install-hook|uninstall-hook|run-hook|annotate <file.md>>
`);
  process.exit(64);
};
var runInstall = async () => {
  const result = await installHook();
  process.stdout.write(`installed symbiot PreToolUse(ExitPlanMode) + PermissionRequest(ExitPlanMode) hooks in ${result.path}
  command: ${result.command}
`);
  return 0;
};
var runUninstall = async () => {
  const result = await uninstallHook();
  process.stdout.write(result.removed === 0 ? `no symbiot hook found in ${result.path}
` : `removed ${result.removed} symbiot hook entr${result.removed === 1 ? "y" : "ies"} from ${result.path}
`);
  return 0;
};
var dispatch = async (argv) => {
  const [command] = argv;
  switch (command) {
    case "install-hook":
      return runInstall();
    case "uninstall-hook":
      return runUninstall();
    case "run-hook":
      return runHook();
    case "annotate":
      return runAnnotate(argv[1]);
    default:
      return usage();
  }
};
dispatch(process.argv.slice(2)).then((code) => process.exit(code), (error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}
`);
  process.exit(1);
});
