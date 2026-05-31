/**
 * `symbiot-codex annotate <file.md>` — boot the viewer in annotate mode against a
 * markdown file under the `codex` storage namespace via the shared
 * {@link runAnnotateShared}. Blocks until the reviewer submits feedback, then
 * prints it to stdout. Exits 0 on submit, 1 on a non-feedback resolution, 64 on
 * a missing path.
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
    binName: "symbiot-codex",
    agentId: "codex",
    indexHtmlGz: viewerHtmlGz,
  });
