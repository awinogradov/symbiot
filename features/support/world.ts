import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repo root from this file. */
export const repoRoot = join(rootDir, "..", "..");

/** Where the viewer persists each Approve/Deny decision during E2E. */
export const decisionFile = join(repoRoot, ".features-generated", "last-decision.json");
