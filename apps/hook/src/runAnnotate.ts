import { readFile } from "node:fs/promises";

import { startServer } from "@symbiot/viewer";
// Bun's compile mode embeds this file into the binary; the import resolves to
// a `$bunfs/…` virtual path at runtime that fs APIs read transparently.
import viewerHtmlGz from "@symbiot/viewer/dist/client/index.html.gz" with { type: "file" };

/**
 * `symbiot annotate <file.md>` — boot the viewer in annotate mode against
 * the given markdown file. Blocks until the reviewer submits feedback,
 * then prints the feedback markdown to stdout.
 *
 * Exits 0 on submit, 1 on missing path.
 */
export const runAnnotate = async (filePath: string | undefined): Promise<number> => {
  if (filePath === undefined) {
    process.stderr.write("usage: symbiot annotate <file.md>\n");
    return 64;
  }
  const plan = await readFile(filePath, "utf8");
  const server = await startServer({
    plan,
    mode: "annotate",
    indexHtmlGz: viewerHtmlGz,
  });
  process.stderr.write(`symbiot: annotate ${filePath} at ${server.url}\n`);
  const decision = await server.resolved;
  await server.stop();
  if (decision.kind === "feedback") {
    process.stdout.write(`${decision.feedback}\n`);
    return 0;
  }
  return 1;
};
