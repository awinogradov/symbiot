import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CoverageReportOptions } from "monocart-coverage-reports";

const rootDir = dirname(fileURLToPath(import.meta.url));
const viewerDist = join(rootDir, "apps", "viewer", "dist", "client");

/**
 * Resolve a source-map URL (`http://127.0.0.1:3210/assets/foo.js.map`) to
 * the on-disk file emitted by Vite, so MCR can map bundled coverage back to
 * the TypeScript sources even after the Playwright `webServer` has shut down.
 */
const localSourceMapResolver = async (
  url: string,
  defaultResolver: (url: string) => Promise<unknown>
): Promise<unknown> => {
  try {
    const u = new URL(url);
    const file = join(viewerDist, u.pathname);
    const text = await readFile(file, "utf8");
    return JSON.parse(text);
  } catch {
    return defaultResolver(url);
  }
};

export const coverageOptions: CoverageReportOptions = {
  name: "symbiot — e2e coverage",
  outputDir: "./coverage/e2e",
  reports: ["v8", "html", "lcovonly", "console-summary"],
  cleanCache: false,
  sourceMapResolver: localSourceMapResolver,
  entryFilter: (entry): boolean => {
    const url = entry.url ?? "";
    if (!url.includes("/assets/")) return false;
    return url.includes("/index-") && url.endsWith(".js");
  },
  sourceFilter: (sourcePath: string): boolean => {
    if (sourcePath.includes("node_modules")) return false;
    if (sourcePath.endsWith(".test.ts")) return false;
    return (
      /(?:^|\/)src\/(client|server|shared)\//.test(sourcePath) ||
      sourcePath.startsWith("apps/viewer/src/") ||
      sourcePath.startsWith("packages/symbiot-")
    );
  },
};
