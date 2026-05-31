/**
 * `symbiot-opencode annotate <file.md>` — boot the viewer in annotate mode against
 * the given markdown file under the `opencode` storage namespace. Blocks until the
 * reviewer submits feedback, then prints the feedback markdown to stdout.
 *
 * This is the manual-review path; the in-process plugin (`./plugin.ts`) drives the
 * automatic `session.idle` flow. Blocking is correct here — a human runs it and waits.
 *
 * Exits 0 on submit, 1 on a non-feedback resolution, 64 on missing path.
 *
 * @example
 *   bun src/cli.ts annotate ./notes.md
 */
import { readFile } from "node:fs/promises";

import { runPlanReview } from "@symbiot/agent-runtime";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };

export const runAnnotate = async (filePath: string | undefined): Promise<number> => {
  if (filePath === undefined) {
    process.stderr.write("usage: symbiot-opencode annotate <file.md>\n");
    return 64;
  }
  const plan = await readFile(filePath, "utf8");
  return runPlanReview({
    plan,
    mode: "annotate",
    serverOptions: { indexHtmlGz: viewerHtmlGz, agentId: "opencode" },
    onStart: (url) => process.stderr.write(`symbiot-opencode: annotate ${filePath} at ${url}\n`),
    onResolved: (decision) => {
      if (decision.kind === "feedback") {
        process.stdout.write(`${decision.feedback}\n`);
        return 0;
      }
      return 1;
    },
  });
};
