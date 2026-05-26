import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { PlanMeta } from "../shared/apiTypes.ts";

/**
 * symbiot's on-disk storage root. All plan history and drafts live under here.
 * Computed per call from `process.env.HOME` so tests can redirect to a tmpdir
 * by mutating `HOME` and re-importing — necessary under Bun, where
 * `os.homedir()` is captured once at runtime startup.
 *
 * @see plans/02-mvp.md — storage layout for the MVP plan-review loop.
 */
export const getStorageRoot = (): string => join(process.env.HOME || homedir(), ".symbiot");

/**
 * Static snapshot of {@link getStorageRoot} captured at module load. Use only
 * where a stable value is acceptable (currently the path-traversal guard for
 * `/api/upload`); prefer {@link getStorageRoot} elsewhere.
 */
export const storageRoot = getStorageRoot();

const historyDir = (): string => join(getStorageRoot(), "history");
const annotationsDir = (): string => join(getStorageRoot(), "annotations");
const draftsDir = (): string => join(getStorageRoot(), "drafts");
const uploadsDir = (): string => join(getStorageRoot(), "uploads");

/** Root directory for `/api/upload` writes. Exposed for security guards. */
export const uploadsRoot = uploadsDir();

export type { PlanMeta };

const slugReplaceRe = /[^a-z0-9]+/g;
const slugTrimRe = /^-+|-+$/g;

const slugify = (input: string): string => {
  const lower = input.trim().toLowerCase().replaceAll(slugReplaceRe, "-").replace(slugTrimRe, "");
  return lower.length > 0 ? lower.slice(0, 64) : "untitled";
};

const firstHeading = (markdown: string): string | null => {
  for (const line of markdown.split("\n")) {
    const match = /^#{1,6}\s+(.+)$/.exec(line);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const deriveProjectSlug = (cwd: string): string => slugify(basename(cwd));

export const derivePlanSlug = (plan: string): string =>
  slugify(firstHeading(plan) ?? "untitled-plan");

/**
 * Injectable git reader used by {@link resolveDisplayName}. Returning `null`
 * means "git is unavailable or this directory is not a working tree" — the
 * resolver falls through to the next layer.
 */
export interface GitReader {
  /** `git rev-parse --git-common-dir` resolved against the working tree at {@link cwd}. */
  readCommonDir: (cwd: string) => string | null;
  /** `git rev-parse --abbrev-ref HEAD`. Returns the literal `HEAD` on detached checkouts. */
  readBranch: (cwd: string) => string | null;
}

interface GitExecError {
  code?: string;
  status?: number;
}

// `ENOENT`: `git` binary is missing from PATH. Exit status 128: git ran but
// reported "not a git repository" or another usage-level failure. Anything
// else (EACCES, signal kills) is unexpected and propagates.
const isExpectedGitMissing = (cause: unknown): boolean => {
  if (typeof cause !== "object" || cause === null) return false;
  const { code, status } = cause as GitExecError;
  return code === "ENOENT" || status === 128;
};

const runGit = (cwd: string, args: string[]): string | null => {
  try {
    // eslint-disable-next-line n/no-sync -- resolved once per server boot, mirrors `buildInfo.ts`.
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch (cause) {
    if (isExpectedGitMissing(cause)) return null;
    throw cause;
  }
};

export const defaultGitReader: GitReader = {
  readCommonDir: (cwd) => runGit(cwd, ["rev-parse", "--git-common-dir"]),
  readBranch: (cwd) => runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]),
};

const repoNameFromCommonDir = (commonDir: string, cwd: string): string | null => {
  // `--git-common-dir` returns the path to the canonical `.git` directory
  // (the *main* worktree's, even when called from a linked worktree). Older
  // git versions return it relative to `cwd` when called from inside the
  // working tree (e.g. just `.git`), so resolve to absolute first. Its
  // parent is the repo root; basename of that is the project.
  const absolute = resolve(cwd, commonDir);
  const parent = dirname(absolute);
  const name = basename(parent);
  return name.length > 0 && name !== "/" ? name : null;
};

const gitDisplayName = (cwd: string, git: GitReader): string | null => {
  const commonDir = git.readCommonDir(cwd);
  if (commonDir === null) return null;
  const repoName = repoNameFromCommonDir(commonDir, cwd);
  if (repoName === null) return null;
  const rawBranch = git.readBranch(cwd);
  if (rawBranch === null || rawBranch === "HEAD") return repoName;
  return `${repoName} · ${rawBranch}`;
};

/**
 * Compose a human-readable title for the viewer's top bar from git context:
 *
 *   1. `<repo>` (or `<repo> · <branch>` when not on a detached HEAD), derived
 *      from `git rev-parse` so worktrees resolve to the canonical repo name
 *      instead of the autopilot-generated worktree directory.
 *   2. `basename(cwd)` — the legacy fallback when git is unavailable.
 *
 * The plan markdown's H1 is intentionally NOT considered here — the editor
 * renders the H1 inside the document body, so surfacing it in the top bar
 * would duplicate it.
 */
export const resolveDisplayName = (cwd: string, git: GitReader = defaultGitReader): string =>
  gitDisplayName(cwd, git) ?? basename(cwd);

const padVersion = (n: number): string => String(n).padStart(3, "0");

const planDir = (project: string, slug: string): string => join(historyDir(), project, slug);

const planFile = (project: string, slug: string, version: number): string =>
  join(planDir(project, slug), `${padVersion(version)}.md`);

const writeAtomic = async (target: string, content: string | Uint8Array): Promise<void> => {
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, content, typeof content === "string" ? "utf8" : undefined);
  await rename(tmp, target);
};

const nextVersionIn = async (dir: string): Promise<number> => {
  try {
    const entries = await readdir(dir);
    const versions = entries
      .map((name) => /^(\d{3})\.md$/.exec(name)?.[1])
      .filter((v): v is string => v !== undefined)
      .map((v) => Number.parseInt(v, 10));
    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 1;
    throw error;
  }
};

/**
 * Persist a fresh plan version under ~/.symbiot/history/{project}/{slug}/00N.md.
 * Atomic-write semantics (write to .tmp + rename).
 */
export const savePlan = async (plan: string, cwd: string = process.cwd()): Promise<PlanMeta> => {
  const project = deriveProjectSlug(cwd);
  const slug = derivePlanSlug(plan);
  const displayName = resolveDisplayName(cwd);
  const version = await nextVersionIn(planDir(project, slug));
  await writeAtomic(planFile(project, slug, version), plan);
  return { project, slug, version, displayName };
};

export const loadPlan = async (meta: PlanMeta): Promise<string> =>
  readFile(planFile(meta.project, meta.slug, meta.version), "utf8");

/**
 * Resolve the absolute on-disk path of a specific plan version. Used by the
 * `vscode-diff` route to feed `code --diff` two real file paths. Caller MUST
 * verify both files exist (e.g. via {@link loadPlan}) before invoking VS Code,
 * because `code` exits silently on missing inputs.
 */
export const planFilePath = (meta: Pick<PlanMeta, "project" | "slug">, version: number): string =>
  planFile(meta.project, meta.slug, version);

/**
 * List every version number persisted under
 * ~/.symbiot/history/{project}/{slug}/, ascending. Returns `[]` when the plan
 * directory does not exist yet.
 */
export const listVersions = async (meta: Pick<PlanMeta, "project" | "slug">): Promise<number[]> => {
  try {
    const entries = await readdir(planDir(meta.project, meta.slug));
    return entries
      .map((name) => /^(\d{3})\.md$/.exec(name)?.[1])
      .filter((v): v is string => v !== undefined)
      .map((v) => Number.parseInt(v, 10))
      .sort((a, b) => a - b);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

const annotationDir = (project: string, slug: string): string =>
  join(annotationsDir(), project, slug);

const annotationFile = (project: string, slug: string, version: number): string =>
  join(annotationDir(project, slug), `${padVersion(version)}.md`);

/**
 * Persist a feedback markdown blob under
 * ~/.symbiot/annotations/{project}/{slug}/00N.md for annotate mode.
 */
export const saveFeedback = async (
  meta: PlanMeta,
  feedback: string
): Promise<{ version: number }> => {
  const version = await nextVersionIn(annotationDir(meta.project, meta.slug));
  await writeAtomic(annotationFile(meta.project, meta.slug, version), feedback);
  return { version };
};

const draftFile = (project: string, slug: string): string =>
  join(draftsDir(), project, slug, "draft.json");

/** Persist the reviewer's in-progress annotations for restoration across reloads. */
export const saveDraft = async (meta: PlanMeta, draft: string): Promise<void> => {
  await writeAtomic(draftFile(meta.project, meta.slug), draft);
};

/** Read the saved draft for this plan, or null if none exists. */
export const loadDraft = async (meta: PlanMeta): Promise<string | null> => {
  try {
    return await readFile(draftFile(meta.project, meta.slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};

/** Remove any saved draft for this plan. Idempotent. */
export const clearDraft = async (meta: PlanMeta): Promise<void> => {
  await rm(draftFile(meta.project, meta.slug), { force: true });
};

const uploadDir = (project: string, slug: string): string => join(uploadsDir(), project, slug);

/** Resolve the on-disk path for an uploaded image. Caller MUST validate the filename. */
export const uploadPath = (meta: PlanMeta, filename: string): string =>
  join(uploadDir(meta.project, meta.slug), filename);

/** Persist uploaded image bytes via atomic write. */
export const saveUpload = async (target: string, bytes: ArrayBuffer): Promise<void> => {
  await writeAtomic(target, new Uint8Array(bytes));
};

/** Read uploaded image bytes from disk. Returns null when the file is absent. */
export const loadUpload = async (target: string): Promise<Buffer | null> => {
  try {
    return await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};
