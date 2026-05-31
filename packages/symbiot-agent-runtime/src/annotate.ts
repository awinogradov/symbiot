/**
 * Shared `annotate <file.md>` flow for every agent integration.
 *
 * `annotate` boots the viewer in annotate mode against a markdown file, blocks
 * until the reviewer submits feedback, and prints that feedback to stdout. The
 * flow is identical across agents — only the bin name (for usage/stderr), the
 * storage namespace (`agentId`), and the embedded viewer bundle differ — so each
 * app passes those in and {@link runAnnotate} owns the rest.
 *
 * The `indexHtmlGz` is embedded into each app's compiled binary via
 * `import … with { type: "file" }`, so it must be imported in the app and passed
 * here rather than imported by this package.
 *
 * @example
 * ```ts
 * import { runAnnotate } from "@symbiot/agent-runtime/annotate";
 * import indexHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };
 * const exitCode = await runAnnotate({ filePath, binName: "symbiot-codex", agentId: "codex", indexHtmlGz });
 * ```
 */
import { readFile } from "node:fs/promises";

import { runPlanReview, type RunPlanReviewOptions } from "./runPlanReview.ts";

/** Options for {@link runAnnotate}. */
export interface RunAnnotateOptions {
  /** Markdown file path from argv, or `undefined` (→ usage error, exit 64). */
  filePath: string | undefined;
  /** Bin name used in usage/stderr lines (e.g. `symbiot`, `symbiot-codex`). */
  binName: string;
  /** Storage namespace passed to the viewer (e.g. `codex`). */
  agentId: string;
  /** The embedded viewer bundle, imported by the app with `{ type: "file" }`. */
  indexHtmlGz: string;
  /** Injection seam for tests; defaults to the real `@symbiot/viewer` `startServer`. */
  startServer?: RunPlanReviewOptions["startServer"];
}

/**
 * Boot the viewer in annotate mode against `filePath`. Exits 0 on submitted
 * feedback (printed to stdout), 1 on a non-feedback resolution, 64 on a missing
 * path.
 */
export const runAnnotate = async ({
  filePath,
  binName,
  agentId,
  indexHtmlGz,
  startServer,
}: RunAnnotateOptions): Promise<number> => {
  if (filePath === undefined) {
    process.stderr.write(`usage: ${binName} annotate <file.md>\n`);
    return 64;
  }
  const plan = await readFile(filePath, "utf8");
  return runPlanReview({
    plan,
    mode: "annotate",
    serverOptions: { indexHtmlGz, agentId },
    startServer,
    onStart: (url) => process.stderr.write(`${binName}: annotate ${filePath} at ${url}\n`),
    onResolved: (decision) => {
      if (decision.kind === "feedback") {
        process.stdout.write(`${decision.feedback}\n`);
        return 0;
      }
      return 1;
    },
  });
};
