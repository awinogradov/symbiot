import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";

const gunzipAsync = promisify(gunzip);

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
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

const acceptsGzip = (req: Request): boolean =>
  (req.headers.get("accept-encoding") ?? "").toLowerCase().includes("gzip");

/**
 * Serve the embedded single-file HTML from a pre-gzipped buffer. Used when the
 * hook runs as a compiled binary — the HTML is read once at boot via
 * `with { type: "file" }` and held in memory. When the browser sends
 * `Accept-Encoding: gzip` we forward the bytes as-is; otherwise we inflate
 * on the fly. Always returns the HTML for any GET (SPA fallback).
 */
// TypeScript 6 + bun-types: `Buffer<ArrayBufferLike>` / `Uint8Array<ArrayBufferLike>`
// don't always unify with Bun's `Response` body type. Referencing the type by
// name (`BodyInit`) breaks under the viewer's bun-only tsconfig; deriving via
// `ConstructorParameters` works in every tsconfig that has the global
// `Response`. Bun's runtime accepts the value as-is.
type ResponseBody = ConstructorParameters<typeof Response>[0];
const asBody = (bytes: Uint8Array | Buffer): ResponseBody =>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  bytes as unknown as ResponseBody;

export const serveEmbeddedHtml = async (req: Request, htmlGz: Uint8Array): Promise<Response> => {
  if (acceptsGzip(req)) {
    return new Response(asBody(htmlGz), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Encoding": "gzip",
        "Cache-Control": "no-cache",
      },
    });
  }
  const inflated = await gunzipAsync(htmlGz);
  return new Response(asBody(inflated), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
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
  return new Response(asBody(body), {
    headers: { "Content-Type": contentType(target) },
  });
};
