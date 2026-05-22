/**
 * Binary + path constants reused across multiple BDD scenarios. Living here
 * keeps the step files declarative and ensures every scenario uploads / seeds
 * against the same bytes.
 */

/** 1×1 transparent PNG buffer used by upload + image-attach scenarios. */
export const transparentPng = (): Buffer =>
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

/** Project slug used by the smoke / e2e fixture plan. */
export const fixtureProjectSlug = "symbiot";

/** Plan slug derived from `fixtures/plans/elements.md`'s first H1. */
export const fixturePlanSlug = "example-plan-with-every-supported-markdown-element";
