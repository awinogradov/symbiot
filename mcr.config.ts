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
 * any non-inlined chunk under `/assets/*.js`. The e2e suite always serves the
 * multi-chunk `dist/client` build — a light `index-*.js` entry plus
 * lazily-loaded `editor-*.js` / `DiffMount-*.js` / Shiki language chunks — so
 * all BDD-owned app code lives in those split chunks. The document URL itself
 * (`/`) now carries only the HTML shell and the inline pre-paint theme
 * bootstrap (no source map); matching it added one unmappable ~150-line
 * anonymous entry per webServer port that halved the reported coverage, so the
 * document is intentionally excluded. Non-app chunks (Shiki grammars, the
 * runtime) resolve only to `node_modules` sources and are dropped by
 * `sourceFilter`, so matching every `/assets/*.js` is safe.
 */
const entryPathnameMatches = (url: string): boolean => {
  try {
    const { pathname } = new URL(url);
    return /^\/assets\/(?:.*\/)?[^/]+\.js$/.test(pathname);
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
  entryFilter: (entry): boolean => {
    if (!entryPathnameMatches(entry.url ?? "")) return false;
    // Drop the inline pre-paint theme bootstrap (see apps/viewer/index.html):
    // it is the only document-level script with no source map, so it never
    // resolves to a src/ file and is instead counted as anonymous coverage
    // once per viewer webServer port. Its dark-theme branch only fires on the
    // port that also runs the theme-toggle scenario, so every extra port drags
    // the branch gate down by a fixed slice — masking the real source number.
    // The sourcemapped app bundle (inlined today, /assets/index-*.js tomorrow)
    // always carries `sourceMappingURL`, so this keeps real coverage intact.
    const source = entry.source ?? "";
    return source.length === 0 || source.includes("sourceMappingURL=");
  },
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
