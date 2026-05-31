/**
 * `symbiot-opencode annotate <file.md>` — boot the viewer in annotate mode against
 * a markdown file under the `opencode` storage namespace via the shared
 * {@link runAnnotateShared}. Blocks until the reviewer submits feedback, then
 * prints it to stdout.
 *
 * This is the manual-review path; the in-process plugin (`./plugin.ts`) drives the
 * automatic `session.idle` flow. Blocking is correct here — a human runs it and waits.
 *
 * Exits 0 on submit, 1 on a non-feedback resolution, 64 on missing path.
 *
 * @example
 *   bun src/cli.ts annotate ./notes.md
 */
import { runAnnotate as runAnnotateShared } from "@symbiot/agent-runtime/annotate";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };

export const runAnnotate = (filePath: string | undefined): Promise<number> =>
  runAnnotateShared({
    filePath,
    binName: "symbiot-opencode",
    agentId: "opencode",
    indexHtmlGz: viewerHtmlGz,
  });
