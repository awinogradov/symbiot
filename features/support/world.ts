import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repo root from this file. */
export const repoRoot = join(rootDir, "..", "..");

/** Where the plan-mode viewer persists each Approve/Deny decision during E2E. */
export const decisionFile = join(repoRoot, ".features-generated", "last-decision.json");

/** Where the annotate-mode viewer persists each Submit-feedback decision during E2E. */
export const annotateDecisionFile = join(repoRoot, ".features-generated", "annotate-decision.json");

/** URL of the annotate-mode viewer instance launched by playwright.config webServer[1]. */
export const annotateBaseUrl = "http://127.0.0.1:3211";

/**
 * URL of the headingless-plan viewer instance launched by playwright.config
 * webServer[2]. Serves a plan with no H1 so the document-title no-H1 fallback
 * is exercised end-to-end (see `features/diagnostics/page-title.feature`).
 */
export const noHeadingBaseUrl = "http://127.0.0.1:3212";
