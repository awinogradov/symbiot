/**
 * @module buildInfo
 * Resolves build-time constants surfaced to the viewer client (app version,
 * git SHA, build timestamp). The pure {@link resolveBuildInfo} composition is
 * injectable via {@link BuildInfoReaders} so the resolver can be tested
 * without spawning git or touching the filesystem. Consumed by
 * `vite.config.ts` and injected into the bundle via Vite's `define` option as
 * the single global `symbiotBuildInfo`.
 *
 * @example
 * import { resolveBuildInfo } from "./buildInfo.ts";
 * const info = resolveBuildInfo();
 * console.log(info.version, info.shaShort, info.builtAt);
 */
/* eslint-disable n/no-sync -- build-time resolver runs once at Vite config load, before any server boots. */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Build-time facts about the running viewer, injected as a global on the client. */
export interface BuildInfo {
  /** Plugin version from `apps/hook/.claude-plugin/plugin.json`. */
  version: string;
  /** `git rev-parse --short HEAD` (or `"dev"` when not in a git checkout). */
  shaShort: string;
  /** `git rev-parse HEAD` (or `"dev"` when not in a git checkout). */
  shaFull: string;
  /** ISO 8601 timestamp captured when this resolver ran. */
  builtAt: string;
}

/** Injected dependencies for {@link resolveBuildInfo} so tests can avoid touching git or the filesystem. */
export interface BuildInfoReaders {
  /** Returns the `version` field of `apps/hook/.claude-plugin/plugin.json`. Throws on missing/malformed input — plugin.json is the release source of truth. */
  readPluginVersion: () => string;
  /** Returns the git HEAD SHA (short or full). Returns `null` when not in a git checkout or git is unavailable. */
  readGitSha: (kind: "short" | "full") => string | null;
  /** Returns the current `Date` for build-timestamp resolution. Injectable so tests get a deterministic ISO output. */
  now: () => Date;
}

const pluginJsonPath = join(import.meta.dirname, "../hook/.claude-plugin/plugin.json");

const readPluginJson = (path: string): unknown => {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`failed to read ${path}: ${message}`, { cause });
  }
  try {
    return JSON.parse(raw);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`failed to parse JSON at ${path}: ${message}`, { cause });
  }
};

const hasVersionField = (parsed: unknown): parsed is { version: unknown } =>
  typeof parsed === "object" && parsed !== null && "version" in parsed;

const extractVersion = (parsed: unknown, path: string): string => {
  if (!hasVersionField(parsed)) {
    throw new Error(`plugin.json missing "version" field: ${path}`);
  }
  const { version } = parsed;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`plugin.json "version" must be a non-empty string: ${path}`);
  }
  return version;
};

export const defaultReaders: BuildInfoReaders = {
  readPluginVersion: () => extractVersion(readPluginJson(pluginJsonPath), pluginJsonPath),
  readGitSha: (kind) => {
    const args = kind === "short" ? ["rev-parse", "--short", "HEAD"] : ["rev-parse", "HEAD"];
    try {
      return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      return null;
    }
  },
  now: () => new Date(),
};

export const resolveBuildInfo = (readers: BuildInfoReaders = defaultReaders): BuildInfo => ({
  version: readers.readPluginVersion(),
  shaShort: readers.readGitSha("short") ?? "dev",
  shaFull: readers.readGitSha("full") ?? "dev",
  builtAt: readers.now().toISOString(),
});
