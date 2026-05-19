import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

/** File extensions permitted for `/api/upload`. Canonical, lowercased. */
export const allowedExtensions: ReadonlyArray<string> = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

const uuidV4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const traversalSegments = new Set(["..", ""]);

/**
 * Pull the extension off a user-supplied filename. Throws when the extension
 * is missing or not on the whitelist. Returns the lowercase canonical form.
 */
export const assertWhitelistedExtension = (filename: string): string => {
  const lower = filename.toLowerCase();
  const found = allowedExtensions.find((ext) => lower.endsWith(ext));
  if (found === undefined) throw new Error(`extension not allowed: ${filename}`);
  return found;
};

const segmentsAreSafe = (rel: string): boolean => {
  for (const segment of rel.split("/")) {
    if (traversalSegments.has(segment)) return false;
  }
  return true;
};

/**
 * Verify that the resolved write target is under the uploads root. Throws on
 * path-traversal payloads (`../`, absolute paths, null bytes, etc.).
 */
export const assertNoTraversal = (uploadsRoot: string, target: string): void => {
  if (target.includes("\0")) throw new Error("null byte in path");
  const resolved = resolve(target);
  const root = resolve(uploadsRoot);
  if (!resolved.startsWith(`${root}/`) && resolved !== root) {
    throw new Error(`path escapes uploads root: ${target}`);
  }
  if (!segmentsAreSafe(resolved.slice(root.length + 1))) {
    throw new Error(`bad path segment in: ${target}`);
  }
};

/**
 * Generate a UUID-v4 filename with the validated extension. The caller's
 * original filename never reaches the filesystem — only `<uuid>.<ext>`.
 */
export const mintUuidFilename = (extension: string): string => `${randomUUID()}${extension}`;

/** True if `id` is a canonical UUID v4 string. */
export const isValidUuid = (id: string): boolean => uuidV4Re.test(id);
