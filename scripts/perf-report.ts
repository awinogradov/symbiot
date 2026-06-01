/**
 * Perf report comment generator.
 *
 * Reads a head snapshot (and optionally a base snapshot) produced by
 * `.github/workflows/perf.yml` and emits a markdown comment body on stdout
 * for `marocchino/sticky-pull-request-comment` to post on the PR.
 *
 * A snapshot directory contains:
 *   - `index.html`               — viewer single-file embed bundle, the self-contained
 *                                  blob agent binaries ship (`dist/embed/index.html`, raw bytes).
 *                                  NOT the multi-chunk `dist/client/index.html` shell, which is
 *                                  ~1.4 KiB and would understate the real payload.
 *   - `lighthouse-viewer.json`   — optional; missing when LH measurement failed
 *   - `meta.json`                — { sha, ref, runId, runUrl, lhStatus }
 *
 * Bundle sizes are computed in-process via async `node:zlib` (gzip + brotli) so
 * the ~3 MB HTML does not block the event loop. Lighthouse headlines are
 * extracted with finite-number guards — partial LH output downgrades that
 * section to "measurement failed" rather than emitting NaN deltas.
 *
 * The script always exits 0. If anything goes wrong, a degraded comment is
 * emitted to stdout and the error is written to stderr — the PR must never
 * be blocked by report generation. The hard-fail gate is a separate future
 * follow-up; do not add a `--fail-on-regression` flag here.
 *
 * Invoked from `.github/workflows/perf.yml`.
 *
 * @example
 *   bun run scripts/perf-report.ts --head perf-snapshot --base perf-baseline > perf-comment.md
 */
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs, promisify } from "node:util";
import { brotliCompress, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

interface SnapshotMeta {
  sha: string;
  ref: string;
  runId: string;
  runUrl: string;
  lhStatus: "success" | "failed";
}

interface BundleSizes {
  raw: number;
  gzip: number;
  brotli: number;
}

interface LhrLike {
  categories?: Record<string, { score?: number | null } | undefined>;
  audits?: Record<string, { numericValue?: number | null } | undefined>;
}

type MetricResult = { ok: true; value: number } | { ok: false; reason: string };

interface LhHeadlines {
  performance: MetricResult;
  accessibility: MetricResult;
  lcpMs: MetricResult;
  tbtMs: MetricResult;
  cls: MetricResult;
  ttiMs: MetricResult;
}

type LhSection = { ok: true; headlines: LhHeadlines } | { ok: false; reason: string };

interface Snapshot {
  bundle: BundleSizes;
  lighthouse: LhSection;
  meta: SnapshotMeta;
}

type BaseSnapshot = { ok: true; snapshot: Snapshot } | { ok: false; reason: string };

type MetricDelta =
  | { kind: "ok"; absolute: number; relative: number | null; regressed: boolean }
  | { kind: "n/a"; reason: string };

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const readJson = async <T>(path: string): Promise<T> => {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as T;
};

const sizeBundle = async (htmlPath: string): Promise<BundleSizes> => {
  const buffer = await readFile(htmlPath);
  const [gz, br] = await Promise.all([gzipAsync(buffer, { level: 9 }), brotliAsync(buffer)]);
  return { raw: buffer.byteLength, gzip: gz.byteLength, brotli: br.byteLength };
};

const extractHeadlines = (lhr: LhrLike): LhHeadlines => {
  const category = (id: string): MetricResult => {
    const score = lhr.categories?.[id]?.score;
    return finite(score) ? { ok: true, value: score } : { ok: false, reason: "missing" };
  };
  const audit = (id: string): MetricResult => {
    const value = lhr.audits?.[id]?.numericValue;
    return finite(value) ? { ok: true, value } : { ok: false, reason: "missing" };
  };
  return {
    performance: category("performance"),
    accessibility: category("accessibility"),
    lcpMs: audit("largest-contentful-paint"),
    tbtMs: audit("total-blocking-time"),
    cls: audit("cumulative-layout-shift"),
    ttiMs: audit("interactive"),
  };
};

const requiredHeadlines: readonly (keyof LhHeadlines)[] = [
  "performance",
  "accessibility",
  "lcpMs",
  "tbtMs",
  "cls",
  "ttiMs",
];

const readLighthouse = async (
  path: string,
  lhStatus: SnapshotMeta["lhStatus"]
): Promise<LhSection> => {
  if (lhStatus !== "success") return { ok: false, reason: "measurement failed" };
  try {
    const lhr = await readJson<LhrLike>(path);
    const headlines = extractHeadlines(lhr);
    const missing = requiredHeadlines.filter((key) => !headlines[key].ok);
    if (missing.length > 0) {
      return { ok: false, reason: `partial measurement (missing ${missing.join(", ")})` };
    }
    return { ok: true, headlines };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `parse error: ${message}` };
  }
};

const loadSnapshot = async (dir: string): Promise<Snapshot> => {
  const meta = await readJson<SnapshotMeta>(resolve(dir, "meta.json"));
  const bundle = await sizeBundle(resolve(dir, "index.html"));
  const lighthouse = await readLighthouse(resolve(dir, "lighthouse-viewer.json"), meta.lhStatus);
  return { bundle, lighthouse, meta };
};

const isReadableDir = async (dir: string): Promise<boolean> => {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
};

const loadBase = async (dir: string | undefined): Promise<BaseSnapshot> => {
  if (dir === undefined) return { ok: false, reason: "no-baseline" };
  if (!(await isReadableDir(dir))) return { ok: false, reason: "no-baseline" };
  try {
    return { ok: true, snapshot: await loadSnapshot(dir) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `perf-report: base snapshot unreadable (${message}); falling back to head-only.\n`
    );
    return { ok: false, reason: "no-baseline" };
  }
};

interface NoiseBand {
  /** Absolute threshold below which a delta is considered noise. */
  absolute: number;
  /** Optional relative threshold (fraction, e.g. 0.05 = 5%). */
  relative?: number;
}

const bundleBand: NoiseBand = { absolute: 1024, relative: 0.05 };
const scoreBand: NoiseBand = { absolute: 0.03 };
const timingBand: NoiseBand = { absolute: 200, relative: 0.1 };
const clsBand: NoiseBand = { absolute: 0.01 };

const relativeChange = (absolute: number, base: number): number | null =>
  base === 0 ? null : absolute / Math.abs(base);

const outsideBand = (absolute: number, relative: number | null, band: NoiseBand): boolean => {
  if (Math.abs(absolute) < band.absolute) return false;
  if (band.relative === undefined) return true;
  if (relative === null) return false;
  return Math.abs(relative) >= band.relative;
};

const deltaFor = (
  head: MetricResult,
  base: MetricResult,
  band: NoiseBand,
  higherIsBetter: boolean
): MetricDelta => {
  if (!head.ok) return { kind: "n/a", reason: head.reason };
  if (!base.ok) return { kind: "n/a", reason: base.reason };
  const absolute = head.value - base.value;
  const relative = relativeChange(absolute, base.value);
  const unfavorable = higherIsBetter ? absolute < 0 : absolute > 0;
  const regressed = outsideBand(absolute, relative, band) && unfavorable;
  return { kind: "ok", absolute, relative, regressed };
};

const bundleDelta = (head: number, base: number): MetricDelta =>
  deltaFor({ ok: true, value: head }, { ok: true, value: base }, bundleBand, false);

// Display helpers reuse the same `outsideBand` decision as the regression
// classifier — a delta inside the noise floor renders `≈ 0` regardless of
// direction, so the table can never advertise sub-noise variance.
const isMeaningful = (delta: MetricDelta, band: NoiseBand): boolean =>
  delta.kind === "ok" && outsideBand(delta.absolute, delta.relative, band);

const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`;
const signedKib = (delta: MetricDelta): string => {
  if (delta.kind === "n/a") return "—";
  if (!isMeaningful(delta, bundleBand)) return "≈ 0";
  const sign = delta.absolute >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(delta.absolute) / 1024).toFixed(1)} KiB`;
};

const formatScore = (result: MetricResult): string =>
  result.ok ? Math.round(result.value * 100).toString() : "—";
const signedScore = (delta: MetricDelta): string => {
  if (delta.kind === "n/a") return "—";
  if (!isMeaningful(delta, scoreBand)) return "≈ 0";
  const points = Math.round(delta.absolute * 100);
  const sign = points >= 0 ? "+" : "-";
  return `${sign}${Math.abs(points)}`;
};

const roundMs = (ms: number): number => (ms >= 1000 ? Math.round(ms / 10) * 10 : Math.round(ms));

const formatMs = (result: MetricResult): string =>
  result.ok ? `${roundMs(result.value).toLocaleString("en-US")} ms` : "—";

const signedMs = (delta: MetricDelta): string => {
  if (delta.kind === "n/a") return "—";
  if (!isMeaningful(delta, timingBand)) return "≈ 0";
  const sign = delta.absolute >= 0 ? "+" : "-";
  return `${sign}${roundMs(Math.abs(delta.absolute)).toLocaleString("en-US")} ms`;
};

const formatCls = (result: MetricResult): string => (result.ok ? result.value.toFixed(3) : "—");
const signedCls = (delta: MetricDelta): string => {
  if (delta.kind === "n/a") return "—";
  if (!isMeaningful(delta, clsBand)) return "—";
  const sign = delta.absolute >= 0 ? "+" : "-";
  return `${sign}${Math.abs(delta.absolute).toFixed(3)}`;
};

const shortSha = (sha: string): string => (sha.length >= 7 ? sha.slice(0, 7) : sha);

// Targets sourced from docs/perf.md. Each defines a `satisfies` predicate
// over the head value plus a human-readable threshold label rendered in the
// Target column.
interface MetricTarget {
  readonly satisfies: (value: number) => boolean;
  readonly label: string;
}

const lhTargets: Partial<Record<keyof LhHeadlines, MetricTarget>> = {
  performance: { satisfies: (v) => v >= 0.9, label: "≥ 90" },
  accessibility: { satisfies: (v) => v >= 0.95, label: "≥ 95" },
  lcpMs: { satisfies: (v) => v <= 1000, label: "≤ 1,000 ms" },
  ttiMs: { satisfies: (v) => v <= 1000, label: "≤ 1,000 ms" },
};

const statusFor = (delta: MetricDelta): string => {
  if (delta.kind === "n/a") return "⚪";
  return delta.regressed ? "🔴" : "🟢";
};

const targetCell = (result: MetricResult, target: MetricTarget | undefined): string => {
  if (target === undefined) return "—";
  if (!result.ok) return `🎯 ${target.label}`;
  return `${target.satisfies(result.value) ? "✅" : "❌"} ${target.label}`;
};

interface Regression {
  metric: string;
  base: string;
  head: string;
  delta: string;
  band: string;
}

const bundleLabel = (key: keyof BundleSizes): string =>
  key === "raw" ? "Raw" : key === "gzip" ? "Gzip" : "Brotli";

const renderBundleRow = (
  key: keyof BundleSizes,
  head: BundleSizes,
  base: BundleSizes | undefined
): string => {
  const headStr = kib(head[key]);
  const label = bundleLabel(key);
  if (base === undefined) {
    return `| ⚪ | ${label} | — | ${headStr} | — |`;
  }
  const delta = bundleDelta(head[key], base[key]);
  return `| ${statusFor(delta)} | ${label} | ${kib(base[key])} | ${headStr} | ${signedKib(delta)} |`;
};

const renderBundleTable = (head: BundleSizes, base: BundleSizes | undefined): string => {
  const headerLines = [
    "### 📦 Bundle — `apps/viewer/dist/embed/index.html`",
    "",
    "| Status | Metric | Base | Head | Δ |",
    "| :---: | :--- | ---: | ---: | ---: |",
  ];
  const rows = (["raw", "gzip", "brotli"] as const).map((key) => renderBundleRow(key, head, base));
  return [...headerLines, ...rows].join("\n");
};

interface LhRowSpec<K extends keyof LhHeadlines> {
  readonly key: K;
  readonly label: string;
  readonly format: (m: MetricResult) => string;
  readonly signed: (d: MetricDelta) => string;
  readonly band: NoiseBand;
  readonly higherIsBetter: boolean;
}

const lhRowSpecs: ReadonlyArray<LhRowSpec<keyof LhHeadlines>> = [
  {
    key: "performance",
    label: "Performance",
    format: formatScore,
    signed: signedScore,
    band: scoreBand,
    higherIsBetter: true,
  },
  {
    key: "accessibility",
    label: "Accessibility",
    format: formatScore,
    signed: signedScore,
    band: scoreBand,
    higherIsBetter: true,
  },
  {
    key: "lcpMs",
    label: "LCP",
    format: formatMs,
    signed: signedMs,
    band: timingBand,
    higherIsBetter: false,
  },
  {
    key: "tbtMs",
    label: "TBT",
    format: formatMs,
    signed: signedMs,
    band: timingBand,
    higherIsBetter: false,
  },
  {
    key: "cls",
    label: "CLS",
    format: formatCls,
    signed: signedCls,
    band: clsBand,
    higherIsBetter: false,
  },
  {
    key: "ttiMs",
    label: "TTI",
    format: formatMs,
    signed: signedMs,
    band: timingBand,
    higherIsBetter: false,
  },
];

const renderLhRow = (
  spec: LhRowSpec<keyof LhHeadlines>,
  head: LhHeadlines,
  baseHeadlines: LhHeadlines | undefined
): string => {
  const headM = head[spec.key];
  const headStr = spec.format(headM);
  const target = targetCell(headM, lhTargets[spec.key]);
  if (baseHeadlines === undefined) {
    return `| ⚪ | ${spec.label} | — | ${headStr} | — | ${target} |`;
  }
  const baseM = baseHeadlines[spec.key];
  const delta = deltaFor(headM, baseM, spec.band, spec.higherIsBetter);
  return `| ${statusFor(delta)} | ${spec.label} | ${spec.format(baseM)} | ${headStr} | ${spec.signed(delta)} | ${target} |`;
};

const renderLhTable = (head: LhSection, base: LhSection | undefined): string => {
  const sectionHeader = "### ⚡ Lighthouse — viewer (desktop, localhost-representative)";
  if (!head.ok) {
    return [
      sectionHeader,
      "",
      `💔 Lighthouse measurement failed on this run (${head.reason}) — see workflow log.`,
    ].join("\n");
  }
  const baseHeadlines = base?.ok === true ? base.headlines : undefined;
  const rows = lhRowSpecs.map((spec) => renderLhRow(spec, head.headlines, baseHeadlines));
  return [
    sectionHeader,
    "",
    "| Status | Metric | Base | Head | Δ | Target |",
    "| :---: | :--- | ---: | ---: | ---: | :--- |",
    ...rows,
  ].join("\n");
};

const collectRegressions = (head: Snapshot, base: Snapshot): Regression[] => {
  const regressions: Regression[] = [];
  const bundle = (key: keyof BundleSizes, label: string): void => {
    const delta = bundleDelta(head.bundle[key], base.bundle[key]);
    if (delta.kind === "ok" && delta.regressed) {
      regressions.push({
        metric: `Bundle ${label}`,
        base: kib(base.bundle[key]),
        head: kib(head.bundle[key]),
        delta: signedKib(delta),
        band: ">= 5% AND >= 1 KiB",
      });
    }
  };
  bundle("raw", "raw");
  bundle("gzip", "gzip");
  bundle("brotli", "brotli");

  if (head.lighthouse.ok && base.lighthouse.ok) {
    const lh = (
      key: keyof LhHeadlines,
      label: string,
      band: NoiseBand,
      higherIsBetter: boolean,
      formatValue: (m: MetricResult) => string,
      formatDelta: (d: MetricDelta) => string,
      bandLabel: string
    ): void => {
      const headM = head.lighthouse.ok
        ? head.lighthouse.headlines[key]
        : { ok: false as const, reason: "n/a" };
      const baseM = base.lighthouse.ok
        ? base.lighthouse.headlines[key]
        : { ok: false as const, reason: "n/a" };
      const delta = deltaFor(headM, baseM, band, higherIsBetter);
      if (delta.kind === "ok" && delta.regressed) {
        regressions.push({
          metric: `LH ${label}`,
          base: formatValue(baseM),
          head: formatValue(headM),
          delta: formatDelta(delta),
          band: bandLabel,
        });
      }
    };
    lh("performance", "Performance", scoreBand, true, formatScore, signedScore, ">= 3 pts");
    lh("accessibility", "Accessibility", scoreBand, true, formatScore, signedScore, ">= 3 pts");
    lh("lcpMs", "LCP", timingBand, false, formatMs, signedMs, ">= 10% AND >= 200 ms");
    lh("tbtMs", "TBT", timingBand, false, formatMs, signedMs, ">= 10% AND >= 200 ms");
    lh("cls", "CLS", clsBand, false, formatCls, signedCls, ">= 0.01");
    lh("ttiMs", "TTI", timingBand, false, formatMs, signedMs, ">= 10% AND >= 200 ms");
  }
  return regressions;
};

const renderRegressionList = (regressions: Regression[]): string => {
  if (regressions.length === 0) return "";
  const lines = regressions.map(
    (r) => `- **${r.metric}**: ${r.base} → ${r.head} (Δ ${r.delta}, band ${r.band})`
  );
  return ["", "**Regressions**", "", ...lines].join("\n");
};

const gzipHighlight = (head: BundleSizes, base: BundleSizes): string => {
  const delta = bundleDelta(head.gzip, base.gzip);
  if (!isMeaningful(delta, bundleBand)) return `gzip ${kib(head.gzip)}`;
  return `gzip ${kib(base.gzip)} → ${kib(head.gzip)}`;
};

const perfHighlight = (headM: MetricResult, baseM: MetricResult): string => {
  if (!headM.ok) return "";
  const head = formatScore(headM);
  if (!baseM.ok) return `Perf ${head}`;
  const delta = deltaFor(headM, baseM, scoreBand, true);
  if (!isMeaningful(delta, scoreBand)) return `Perf ${head}`;
  return `Perf ${formatScore(baseM)} → ${head}`;
};

const renderHeadlineHighlight = (head: Snapshot, base: Snapshot): string => {
  const bundle = gzipHighlight(head.bundle, base.bundle);
  if (!head.lighthouse.ok || !base.lighthouse.ok) return bundle;
  const perf = perfHighlight(
    head.lighthouse.headlines.performance,
    base.lighthouse.headlines.performance
  );
  if (perf === "") return bundle;
  return `${perf} · ${bundle}`;
};

const renderHeadline = (head: Snapshot, base: BaseSnapshot, regressions: Regression[]): string => {
  if (!base.ok) {
    return "🆕 **no baseline available** — this PR will establish one once main has a successful perf run.";
  }
  if (regressions.length > 0) {
    return `⚠️ **warning** — ${regressions.length.toString()} metric(s) regressed (no hard-fail yet).`;
  }
  return `✅ **within budget** · ${renderHeadlineHighlight(head, base.snapshot)}`;
};

const renderFooter = (head: Snapshot, base: BaseSnapshot): string => {
  const headSha = `<code>${shortSha(head.meta.sha)}</code>`;
  const compare = base.ok
    ? `Baseline <code>${shortSha(base.snapshot.meta.sha)}</code> → Head ${headSha}`
    : `Head ${headSha}`;
  const link = `<a href="${head.meta.runUrl}">workflow run</a>`;
  return `<sub>${compare} · ${link} · artifacts: <code>bundle-stats.html</code>, <code>lighthouse-viewer.json</code></sub>`;
};

const renderComment = (head: Snapshot, base: BaseSnapshot): string => {
  const regressions = base.ok ? collectRegressions(head, base.snapshot) : [];
  const sections = [
    "## Perf report",
    "",
    renderHeadline(head, base, regressions),
    "",
    renderBundleTable(head.bundle, base.ok ? base.snapshot.bundle : undefined),
    "",
    renderLhTable(head.lighthouse, base.ok ? base.snapshot.lighthouse : undefined),
  ];
  const regressionBlock = renderRegressionList(regressions);
  if (regressionBlock !== "") sections.push(regressionBlock);
  sections.push("", renderFooter(head, base));
  return `${sections.join("\n")}\n`;
};

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    strict: true,
    allowPositionals: false,
    options: {
      head: { type: "string" },
      base: { type: "string" },
    },
  });
  if (values.head === undefined) throw new Error("--head <dir> is required");

  const head = await loadSnapshot(values.head);
  const base = await loadBase(values.base);
  process.stdout.write(renderComment(head, base));
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`perf-report: ${message}\n`);
  process.stdout.write(`## Perf report\n\nReport generation failed: ${message}\n`);
  process.exit(0);
});
