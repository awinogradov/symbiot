import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * When the CLI is bundled into `apps/hook/dist/cli.js` (the path the Claude
 * Code plugin manifest invokes), the viewer client lives next to it at
 * `dist/client/`. In dev (`bun src/cli.ts`) that sibling does not exist;
 * returning `undefined` lets `startServer` fall back to its default
 * (`apps/viewer/dist/client`).
 */
export const bundledStaticRoot = async (entryUrl: string): Promise<string | undefined> => {
  const candidate = join(dirname(fileURLToPath(entryUrl)), "client");
  try {
    await access(candidate);
    return candidate;
  } catch {
    return undefined;
  }
};
