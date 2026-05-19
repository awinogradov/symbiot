import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import type { PlanMeta } from "../shared/api-types.ts";

/**
 * symbiot's on-disk storage root. All plan history and drafts live under here.
 *
 * @see plans/02-mvp.md — storage layout for the MVP plan-review loop.
 */
export const storageRoot = join(homedir(), ".symbiot");

const historyDir = join(storageRoot, "history");
const annotationsDir = join(storageRoot, "annotations");

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

const padVersion = (n: number): string => String(n).padStart(3, "0");

const planDir = (project: string, slug: string): string => join(historyDir, project, slug);

const planFile = (project: string, slug: string, version: number): string =>
  join(planDir(project, slug), `${padVersion(version)}.md`);

const writeAtomic = async (target: string, content: string): Promise<void> => {
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, target);
};

const nextVersion = async (project: string, slug: string): Promise<number> => {
  const dir = planDir(project, slug);
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
  const version = await nextVersion(project, slug);
  await writeAtomic(planFile(project, slug, version), plan);
  return { project, slug, version };
};

export const loadPlan = async (meta: PlanMeta): Promise<string> =>
  readFile(planFile(meta.project, meta.slug, meta.version), "utf8");

const annotationFile = (project: string, slug: string, version: number): string =>
  join(annotationsDir, project, slug, `${padVersion(version)}.md`);

const nextAnnotationVersion = async (project: string, slug: string): Promise<number> => {
  const dir = join(annotationsDir, project, slug);
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
 * Persist a feedback markdown blob under
 * ~/.symbiot/annotations/{project}/{slug}/00N.md for annotate mode.
 */
export const saveFeedback = async (
  meta: PlanMeta,
  feedback: string
): Promise<{ version: number }> => {
  const version = await nextAnnotationVersion(meta.project, meta.slug);
  await writeAtomic(annotationFile(meta.project, meta.slug, version), feedback);
  return { version };
};
