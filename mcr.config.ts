import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CoverageReportOptions } from "monocart-coverage-reports";

import { isBddOwned } from "./coverage-scopes.ts";

const rootDir = dirname(fileURLToPath(import.meta.url));
const viewerDist = join(rootDir, "apps", "viewer", "dist", "client");

const bddThreshold = 90;
const bddMetrics = ["lines", "statements", "branches", "functions"] as const;
const bddSummaryDir = "./coverage/e2e";
const bddSummaryPath = `${bddSummaryDir}/summary.md`;

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
  reports: ["v8", "html", "lcovonly", "console-summary"],
  cleanCache: false,
  sourceMapResolver: localSourceMapResolver,
  entryFilter: (entry): boolean => entryPathnameMatches(entry.url ?? ""),
  sourceFilter: (sourcePath: string): boolean => {
    if (sourcePath.includes("node_modules")) return false;
    if (sourcePath.endsWith(".test.ts") || sourcePath.endsWith(".test.tsx")) return false;
    return isBddOwned(sourcePath);
  },
  onEnd: async (results): Promise<void> => {
    if (!results) {
      await mkdir(bddSummaryDir, { recursive: true });
      await writeFile(
        bddSummaryPath,
        [
          `## Coverage Report for BDD`,
          "",
          `_No coverage results produced — Vite build / entry-filter mismatch or no payloads aggregated._`,
          "",
        ].join("\n"),
        "utf8"
      );
      throw new Error("BDD coverage produced no results");
    }
    const { summary } = results;
    const measured = bddMetrics.map((metric) => {
      const pct = summary[metric]?.pct;
      return { metric, pct: Number.isFinite(pct) ? (pct as number) : null };
    });
    const missing = measured.filter(({ pct }) => pct === null).map(({ metric }) => metric);
    const rows = measured.map(({ metric, pct }) => {
      if (pct === null) return `| ${metric} | n/a | Fail |`;
      const status = pct >= bddThreshold ? "Pass" : "Fail";
      return `| ${metric} | ${pct.toFixed(2)}% | ${status} |`;
    });
    const body = [
      `## Coverage Report for BDD`,
      "",
      `_Threshold: ${bddThreshold}% on lines / statements / branches / functions._`,
      "",
      "| Metric | Coverage | Status |",
      "| --- | --- | --- |",
      ...rows,
      "",
    ].join("\n");
    await mkdir(bddSummaryDir, { recursive: true });
    await writeFile(bddSummaryPath, body, "utf8");
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
