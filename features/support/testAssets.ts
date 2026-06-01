/**
 * Binary + path constants reused across multiple BDD scenarios. Living here
 * keeps the step files declarative and ensures every scenario uploads / seeds
 * against the same bytes.
 */
import { deriveProjectSlug } from "../../apps/viewer/src/server/storage.ts";

import { repoRoot } from "./world.ts";

/** 1×1 transparent PNG buffer used by upload + image-attach scenarios. */
export const transparentPng = (): Buffer =>
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

/**
 * Project slug the viewer stores history/drafts under. The viewer derives it from
 * `basename(cwd)` (see `deriveProjectSlug` in apps/viewer), so seeding must use the
 * same derivation — `"symbiot"` in CI (checkout dir) but the worktree name locally.
 */
export const fixtureProjectSlug = deriveProjectSlug(repoRoot);

/** Slug derived from `fixtures/markdown/elements.md`'s first H1. */
export const fixturePlanSlug = "example-plan-with-every-supported-markdown-element";
