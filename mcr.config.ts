import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CoverageReportOptions } from "monocart-coverage-reports";

import { isBddOwned } from "./coverage-scopes.ts";

const rootDir = dirname(fileURLToPath(import.meta.url));
const viewerDist = join(rootDir, "apps", "viewer", "dist", "client");

const bddThreshold = 90;
const bddMetrics = ["lines", "statements", "branches", "functions"] as const;

/**
 * Match V8 coverage entries against the two shapes the viewer build can take:
 * an inline `<script type="module">` reported under the document URL (the
 * single-file Vite build the viewer ships today), or a non-inlined chunk
 * `/assets/index-*.js` (kept for any future test-mode build that disables
 * `vite-plugin-singlefile`).
 */
const entryPathnameMatches = (url: string): boolean => {
  try {
    const { pathname } = new URL(url);
    if (pathname === "/" || pathname.endsWith("/index.html")) return true;
    return /^\/assets\/(?:.*\/)?index-.*\.js$/.test(pathname);
  } catch {
    return false;
  }
};

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
  // Istanbul-format `json-summary` + `json` outputs are consumed by
  // `davelosert/vitest-coverage-report-action@v2` in `.github/workflows/pr.yml`
  // so the BDD sticky PR comment mirrors the Unit comment's layout. Filenames
  // are pinned so an upstream MCR default change cannot silently break the
  // workflow's `hashFiles(...)` guard. `console-summary` stays last so its
  // stdout output doesn't interleave with file-write reporters in CI logs.
  reports: [
    "v8",
    "html",
    "lcovonly",
    ["json", { file: "coverage-final.json" }],
    ["json-summary", { file: "coverage-summary.json" }],
    "console-summary",
  ],
  cleanCache: false,
  sourceMapResolver: localSourceMapResolver,
  entryFilter: (entry): boolean => entryPathnameMatches(entry.url ?? ""),
  sourceFilter: (sourcePath: string): boolean => {
    if (sourcePath.includes("node_modules")) return false;
    if (sourcePath.endsWith(".test.ts") || sourcePath.endsWith(".test.tsx")) return false;
    return isBddOwned(sourcePath);
  },
  onEnd: async (results): Promise<void> => {
    // MCR ≥2.12 short-circuits in `generate()` before invoking `onEnd` when
    // no payloads aggregated, but the parameter is still typed as optional.
    // Keep a minimal throw so the BDD step fails loudly; the davelosert PR
    // comment is suppressed naturally by the workflow's `hashFiles` guard
    // (no `coverage-summary.json` is written when MCR has nothing to report).
    if (!results) throw new Error("BDD coverage produced no results");
    const { summary } = results;
    const measured = bddMetrics.map((metric) => {
      const pct = summary[metric]?.pct;
      return { metric, pct: Number.isFinite(pct) ? (pct as number) : null };
    });
    const missing = measured.filter(({ pct }) => pct === null).map(({ metric }) => metric);
    if (missing.length > 0) {
      throw new Error(`BDD coverage missing metrics: ${missing.join(", ")}`);
    }
    const failed = measured.filter(({ pct }) => pct !== null && pct < bddThreshold);
    if (failed.length > 0) {
      const details = failed
        .map(({ metric, pct }) => `${metric}=${(pct as number).toFixed(2)}%`)
        .join(", ");
      throw new Error(`BDD coverage below ${bddThreshold}%: ${details}`);
    }
  },
};
