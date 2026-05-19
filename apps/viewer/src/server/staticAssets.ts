import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const contentType = (path: string): string =>
  mimeTypes[extname(path)] ?? "application/octet-stream";

const safeJoin = (root: string, requestPath: string): string | null => {
  const target = resolve(root, `.${normalize(requestPath)}`);
  return target.startsWith(`${resolve(root)}/`) || target === resolve(root) ? target : null;
};

const readOr = async (path: string): Promise<Buffer | null> => {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
};

/**
 * Serve a built Vite client bundle (apps/viewer/dist/client) for any
 * non-/api/* request. Falls back to index.html so client-side routes resolve.
 */
export const serveStatic = async (
  rootDir: string,
  requestPath: string
): Promise<Response | null> => {
  const target = safeJoin(rootDir, requestPath === "/" ? "/index.html" : requestPath);
  if (target === null) return new Response("Forbidden", { status: 403 });
  const body = (await readOr(target)) ?? (await readOr(join(rootDir, "index.html")));
  if (body === null) return null;
  return new Response(body, { headers: { "Content-Type": contentType(target) } });
};
