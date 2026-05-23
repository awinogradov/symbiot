/**
 * Lighthouse perf budget runner.
 *
 * Boots the built viewer against the reference plan
 * (`fixtures/plans/elements.md`, <50KB) on a free localhost port, runs
 * Lighthouse via `chrome-launcher` + `lighthouse` under the default mobile
 * profile (simulated Slow 4G + 4× CPU throttling), and writes a JSON report
 * to `perf-reports/lighthouse-viewer.json`. Prints headline Performance,
 * Accessibility, LCP, TBT, CLS, TTI to stdout.
 *
 * Invoked from `bun run perf`. Requires `bun run --filter @symbiot/viewer
 * build` to have produced `apps/viewer/dist/bin.js` first.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Run the viewer from source. `apps/viewer/dist/bin.js` is the Bun-bundled
// entry point intended for embedding from the hook (which injects
// `indexHtmlGz`); its `defaultStaticRoot` is computed relative to the source
// path of `startServer.ts`, so when bundled it cannot find `dist/client/`.
// Source-mode resolves the static root correctly and still requires the
// preceding `vite build` to have produced `dist/client/index.html`.
const viewerSrc = resolve(repoRoot, "apps/viewer/src/bin.ts");
const viewerDistClient = resolve(repoRoot, "apps/viewer/dist/client/index.html");
const planFixture = resolve(repoRoot, "fixtures/plans/elements.md");
const reportDir = resolve(repoRoot, "perf-reports");
const reportPath = resolve(reportDir, "lighthouse-viewer.json");
const startupTimeoutMs = 10_000;

const findFreePort = async (): Promise<number> =>
  new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.on("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        rejectPort(new Error("failed to obtain a free port"));
        return;
      }
      const { port } = address;
      server.close(() => resolvePort(port));
    });
  });

const waitForViewerUrl = (
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number
): Promise<string> =>
  new Promise((resolveUrl, rejectUrl) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      rejectUrl(new Error(`viewer did not announce a URL within ${timeoutMs}ms`));
    }, timeoutMs);
    const onStdout = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      const match = buffer.match(/symbiot viewer listening at (http:\/\/\S+)/);
      if (match !== null) {
        cleanup();
        resolveUrl(match[1]);
      }
    };
    const onExit = (code: number | null): void => {
      cleanup();
      rejectUrl(new Error(`viewer exited (code=${String(code)}) before announcing a URL`));
    };
    const onError = (err: Error): void => {
      cleanup();
      rejectUrl(err);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      child.stdout.off("data", onStdout);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    child.stdout.on("data", onStdout);
    child.once("exit", onExit);
    child.once("error", onError);
  });

const ensureViewerBuild = async (): Promise<void> => {
  try {
    await stat(viewerDistClient);
  } catch {
    throw new Error(
      `viewer client build not found at ${viewerDistClient}. Run \`bun run --filter @symbiot/viewer build\` first.`
    );
  }
};

const startViewer = async (port: number): Promise<ChildProcessWithoutNullStreams> => {
  const child = spawn(
    "bun",
    [viewerSrc, "--plan", planFixture, "--port", String(port), "--no-open", "--keep-alive"],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
  );
  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[viewer] ${chunk.toString("utf8")}`);
  });
  return child;
};

const killViewer = (child: ChildProcessWithoutNullStreams): Promise<void> =>
  new Promise((resolveKill) => {
    if (child.exitCode !== null) {
      resolveKill();
      return;
    }
    child.once("exit", () => resolveKill());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2_000);
  });

interface HeadlineScores {
  performance: number | null;
  accessibility: number | null;
  lcpMs: number | null;
  tbtMs: number | null;
  cls: number | null;
  ttiMs: number | null;
}

const formatScore = (score: number | null): string =>
  score === null ? "n/a" : Math.round(score * 100).toString();

const formatMs = (ms: number | null): string =>
  ms === null ? "n/a" : `${Math.round(ms).toString()}ms`;

const formatCls = (cls: number | null): string => (cls === null ? "n/a" : cls.toFixed(3));

interface LhrLike {
  categories: Record<string, { score: number | null } | undefined>;
  audits: Record<string, { numericValue?: number } | undefined>;
}

const categoryScore = (lhr: LhrLike, id: string): number | null =>
  lhr.categories[id]?.score ?? null;

const auditNumeric = (lhr: LhrLike, id: string): number | null =>
  lhr.audits[id]?.numericValue ?? null;

const extractHeadlines = (lhr: LhrLike): HeadlineScores => ({
  performance: categoryScore(lhr, "performance"),
  accessibility: categoryScore(lhr, "accessibility"),
  lcpMs: auditNumeric(lhr, "largest-contentful-paint"),
  tbtMs: auditNumeric(lhr, "total-blocking-time"),
  cls: auditNumeric(lhr, "cumulative-layout-shift"),
  ttiMs: auditNumeric(lhr, "interactive"),
});

const main = async (): Promise<void> => {
  await ensureViewerBuild();
  await mkdir(reportDir, { recursive: true });

  const port = await findFreePort();
  const viewer = await startViewer(port);

  let chrome: chromeLauncher.LaunchedChrome | null = null;
  try {
    const url = await waitForViewerUrl(viewer, startupTimeoutMs);
    chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
    const runnerResult = await lighthouse(url, {
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility"],
      port: chrome.port,
    });
    if (runnerResult === undefined) {
      throw new Error("lighthouse returned no result");
    }
    const reportJson = Array.isArray(runnerResult.report)
      ? runnerResult.report[0]
      : runnerResult.report;
    await writeFile(reportPath, reportJson, "utf8");

    const headlines = extractHeadlines(runnerResult.lhr);
    process.stdout.write(`Lighthouse report → ${reportPath}\n`);
    process.stdout.write(`  Performance:   ${formatScore(headlines.performance)}\n`);
    process.stdout.write(`  Accessibility: ${formatScore(headlines.accessibility)}\n`);
    process.stdout.write(`  LCP:           ${formatMs(headlines.lcpMs)}\n`);
    process.stdout.write(`  TBT:           ${formatMs(headlines.tbtMs)}\n`);
    process.stdout.write(`  CLS:           ${formatCls(headlines.cls)}\n`);
    process.stdout.write(`  TTI:           ${formatMs(headlines.ttiMs)}\n`);
  } finally {
    if (chrome !== null) await chrome.kill();
    await killViewer(viewer);
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`perf-lighthouse: ${message}\n`);
  process.exit(1);
});
