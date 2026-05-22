import { readFile } from "node:fs/promises";

import { startServer } from "@symbiot/viewer";

import { bundledStaticRoot } from "./bundledStaticRoot.ts";

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
    staticRoot: await bundledStaticRoot(import.meta.url),
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
