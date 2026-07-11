import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { PlanMeta } from "../shared/apiTypes.ts";

/**
 * symbiot's on-disk storage root. All plan history and drafts live under here.
 * Computed per call from `process.env.HOME` so tests can redirect to a tmpdir
 * by mutating `HOME` and re-importing — necessary under Bun, where
 * `os.homedir()` is captured once at runtime startup.
 */
export const getStorageRoot = (): string => join(process.env.HOME || homedir(), ".symbiot");

/**
 * Static snapshot of {@link getStorageRoot} captured at module load. Use only
 * where a stable value is acceptable (currently the path-traversal guard for
 * `/api/upload`); prefer {@link getStorageRoot} elsewhere.
 */
export const storageRoot = getStorageRoot();

/**
 * Default agent slug. Single-agent (Claude Code only) installs and the bare
 * `symbiot` CLI use this, so `startServer({ agentId })` stays optional and
 * pre-namespacing data migrates into this namespace (see {@link migrateLegacyTree}).
 */
export const defaultAgentId = "claude-code";

const agentIdRe = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Guard the `<agent-id>` path segment. Slugs come from trusted callers
 * (`startServer({ agentId })`, defaulting to `claude-code`), but validating
 * here stops a malformed slug from escaping the `agents/` namespace.
 */
export const assertValidAgentId = (agentId: string): void => {
  if (!agentIdRe.test(agentId)) throw new Error(`invalid agentId: ${JSON.stringify(agentId)}`);
};

const agentDir = (agentId: string): string => {
  assertValidAgentId(agentId);
  return join(getStorageRoot(), "agents", agentId);
};

const historyDir = (agentId: string): string => join(agentDir(agentId), "history");
const annotationsDir = (agentId: string): string => join(agentDir(agentId), "annotations");
const draftsDir = (agentId: string): string => join(agentDir(agentId), "drafts");
const uploadsDir = (agentId: string): string => join(agentDir(agentId), "uploads");

/** Root directory for a given agent's `/api/upload` writes. Exposed for security guards. */
export const agentUploadsRoot = (agentId: string): string => uploadsDir(agentId);

/** Per-agent subtrees relocated by {@link migrateLegacyTree} from the flat root. */
const legacySubdirs = ["history", "annotations", "drafts", "uploads"] as const;

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);
    return true;
  } catch (error) {
    // ENOENT: nothing there. ENOTDIR: a parent component is a file, so the path
    // cannot exist either — both mean "absent" for migration purposes (mirrors
    // the hook's isMissingPath).
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw error;
  }
};

// A concurrent boot can win the rename: it may populate `to` (EEXIST/ENOTEMPTY)
// or move `from` away first (ENOENT). `rename` is only reached after we confirm
// `from` existed and `to` did not, so any of these means another boot already
// completed this subtree's migration — idempotent, not an error to propagate.
const isBenignRenameRace = (code: string | undefined): boolean =>
  code === "EEXIST" || code === "ENOTEMPTY" || code === "ENOENT";

const moveLegacySubdir = async (from: string, to: string, agentRoot: string): Promise<void> => {
  if (!(await pathExists(from)) || (await pathExists(to))) return;
  await mkdir(agentRoot, { recursive: true });
  try {
    await rename(from, to);
  } catch (error) {
    if (!isBenignRenameRace((error as NodeJS.ErrnoException).code)) throw error;
  }
};

/**
 * One-shot migration of pre-namespacing state into the {@link defaultAgentId}
 * namespace. Old installs wrote per-plan state flat under `~/.symbiot/<subdir>`;
 * it all belonged to Claude Code (the only agent then). Each subtree moves only
 * when the legacy path exists and the namespaced target does not, so this is
 * idempotent and never clobbers already-namespaced state. Runs on every boot.
 */
export const migrateLegacyTree = async (): Promise<void> => {
  const root = getStorageRoot();
  const target = agentDir(defaultAgentId);
  await Promise.all(
    legacySubdirs.map((sub) => moveLegacySubdir(join(root, sub), join(target, sub), target))
  );
};

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

const planDir = (agentId: string, project: string, slug: string): string =>
  join(historyDir(agentId), project, slug);

const planFile = (agentId: string, project: string, slug: string, version: number): string =>
  join(planDir(agentId, project, slug), `${padVersion(version)}.md`);

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
 * Persist a fresh plan version under
 * ~/.symbiot/agents/{agentId}/history/{project}/{slug}/00N.md.
 * Atomic-write semantics (write to .tmp + rename).
 *
 * `slug` overrides the H1-derived plan slug. Draft mode passes it (`--slug`)
 * so iteration continuity never hangs on the document title staying stable —
 * a retitled draft keeps appending to the same history directory.
 */
export const savePlan = async (
  agentId: string,
  plan: string,
  cwd: string = process.cwd(),
  slug?: string
): Promise<PlanMeta> => {
  const project = deriveProjectSlug(cwd);
  const planSlug = slug ?? derivePlanSlug(plan);
  const displayName = resolveDisplayName(cwd);
  const version = await nextVersionIn(planDir(agentId, project, planSlug));
  await writeAtomic(planFile(agentId, project, planSlug, version), plan);
  return { project, slug: planSlug, version, displayName };
};

/**
 * Append the next plan version under an existing session's `{project, slug}`
 * without re-deriving either (draft mode's "Send to agent" persistence — the
 * session meta, not the document's current H1, owns continuity). Returns the
 * persisted version number and its absolute on-disk path.
 */
export const saveRevision = async (
  agentId: string,
  meta: Pick<PlanMeta, "project" | "slug">,
  plan: string
): Promise<{ version: number; path: string }> => {
  const version = await nextVersionIn(planDir(agentId, meta.project, meta.slug));
  const path = planFile(agentId, meta.project, meta.slug, version);
  await writeAtomic(path, plan);
  return { version, path };
};

export const loadPlan = async (agentId: string, meta: PlanMeta): Promise<string> =>
  readFile(planFile(agentId, meta.project, meta.slug, meta.version), "utf8");

/**
 * Resolve the absolute on-disk path of a specific plan version. Used by the
 * `vscode-diff` route to feed `code --diff` two real file paths. Caller MUST
 * verify both files exist (e.g. via {@link loadPlan}) before invoking VS Code,
 * because `code` exits silently on missing inputs.
 */
export const planFilePath = (
  agentId: string,
  meta: Pick<PlanMeta, "project" | "slug">,
  version: number
): string => planFile(agentId, meta.project, meta.slug, version);

/**
 * List every version number persisted under
 * ~/.symbiot/agents/{agentId}/history/{project}/{slug}/, ascending. Returns
 * `[]` when the plan directory does not exist yet.
 */
export const listVersions = async (
  agentId: string,
  meta: Pick<PlanMeta, "project" | "slug">
): Promise<number[]> => {
  try {
    const entries = await readdir(planDir(agentId, meta.project, meta.slug));
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

const annotationDir = (agentId: string, project: string, slug: string): string =>
  join(annotationsDir(agentId), project, slug);

const annotationFile = (agentId: string, project: string, slug: string, version: number): string =>
  join(annotationDir(agentId, project, slug), `${padVersion(version)}.md`);

/**
 * Persist a feedback markdown blob under
 * ~/.symbiot/agents/{agentId}/annotations/{project}/{slug}/00N.md for annotate mode.
 */
export const saveFeedback = async (
  agentId: string,
  meta: PlanMeta,
  feedback: string
): Promise<{ version: number }> => {
  const version = await nextVersionIn(annotationDir(agentId, meta.project, meta.slug));
  await writeAtomic(annotationFile(agentId, meta.project, meta.slug, version), feedback);
  return { version };
};

const draftFile = (agentId: string, project: string, slug: string): string =>
  join(draftsDir(agentId), project, slug, "draft.json");

/** Persist the reviewer's in-progress annotations for restoration across reloads. */
export const saveDraft = async (agentId: string, meta: PlanMeta, draft: string): Promise<void> => {
  await writeAtomic(draftFile(agentId, meta.project, meta.slug), draft);
};

/** Read the saved draft for this plan, or null if none exists. */
export const loadDraft = async (agentId: string, meta: PlanMeta): Promise<string | null> => {
  try {
    return await readFile(draftFile(agentId, meta.project, meta.slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};

/** Remove any saved draft for this plan. Idempotent. */
export const clearDraft = async (agentId: string, meta: PlanMeta): Promise<void> => {
  await rm(draftFile(agentId, meta.project, meta.slug), { force: true });
};

const uploadDir = (agentId: string, project: string, slug: string): string =>
  join(uploadsDir(agentId), project, slug);

/** Resolve the on-disk path for an uploaded image. Caller MUST validate the filename. */
export const uploadPath = (agentId: string, meta: PlanMeta, filename: string): string =>
  join(uploadDir(agentId, meta.project, meta.slug), filename);

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
