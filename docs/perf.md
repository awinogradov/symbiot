# Performance budget

## Targets

- Viewer must be interactive within **1 s** on plans up to **50 KB** of markdown (Lighthouse "Time to Interactive" / "Largest Contentful Paint" audits, default mobile profile).
- Lighthouse **Performance ≥ 90**, **Accessibility ≥ 95**.

## Reproduction

### Bundle treemap (gzip + Brotli sizes)

```sh
bun run --filter @symbiot/viewer bundle-analyze
open apps/viewer/bundle-stats/index.html
```

Runs `vite build` for the viewer with the `rollup-plugin-visualizer` plugin enabled (gated by `SYMBIOT_BUNDLE_ANALYZE=1`). The viewer builds **two artifacts** (see [`architecture.md`](./architecture.md) → _Viewer build & serving_): the default `vite build` emits the multi-chunk `dist/client/` (a light shell plus deferred `editor` / `shiki` chunks) served by `serveStatic`, and `SYMBIOT_SINGLEFILE=1 vite build` emits the inlined `dist/embed/index.html` embedded into agent binaries. `bundle-analyze` profiles the default multi-chunk build, so the treemap shows the per-chunk split (entry vs. lazy `editor` vs. Shiki languages).

### Lighthouse (default mobile profile, simulated Slow 4G + 4× CPU)

```sh
bun run --filter @symbiot/viewer build
bun run perf
# → perf-reports/lighthouse-viewer.json
```

`scripts/perf-lighthouse.ts` spawns the viewer server from source (`apps/viewer/src/bin.ts`) against the freshly built static client (`apps/viewer/dist/client/index.html`) on a free localhost port with `--plan fixtures/markdown/elements.md --no-open --keep-alive`, launches headless Chrome via `chrome-launcher`, and runs Lighthouse against it for the `performance` + `accessibility` categories. Headline scores (Performance, Accessibility, LCP, TBT, CLS, TTI) are printed to stdout; the full report lands in `perf-reports/lighthouse-viewer.json` and is git-ignored.

The spawned viewer's `HOME` is redirected to an ephemeral temp directory for the run and removed afterwards, so repeated `bun run perf` calls do not pollute your real `~/.symbiot/` plan-history store. The script returns exit 0 regardless of the scores — this is a reporting tool, not a CI gate. A hard-fail-on-regression gate is a follow-up.

> The Bun-bundled `apps/viewer/dist/bin.js` is intentionally not used here: its `defaultStaticRoot` is computed relative to `startServer.ts`'s source path and breaks once bundled, so it can only serve a client when the hook injects `indexHtmlGz`. Spawning the source bin sidesteps that.

## Baseline

Captured against `fixtures/markdown/elements.md` (~1 KB markdown) on `main`, post-#185.

- **Bundle, embed artifact** (single-file `apps/viewer/dist/embed/index.html`, the blob agent binaries serve over localhost):
  - **~2,814 KB raw · ~646 KB gzipped** (was 3,396.5 KB raw / 857.2 KB gzip pre-#185).
- **Bundle, served artifact** (multi-chunk `apps/viewer/dist/client/`, what `serveStatic` and the Lighthouse harness measure):
  - First-paint critical path is the **~1.5 KB shell `index.html` + ~96 KB gzip entry chunk + ~12 KB gzip CSS**. The ~414 KB gzip `editor` chunk and the Shiki language chunks load lazily, off the first-paint path.
  - Treemap source of truth: `apps/viewer/bundle-stats/index.html`.
- **Lighthouse** (default mobile profile, simulated Slow 4G + 4× CPU, served multi-chunk build):
  - **Performance: 56** (was 25–39) — still below the ≥ 90 target.
  - **Accessibility: 100** — above the ≥ 95 target.
  - LCP: ~16,200 ms · **TBT: ~68 ms** (was 2,750–3,760 ms) · CLS: 0.000 · TTI: ~16,200 ms

#185 landed the big levers: Shiki now runs on the pure-JS RegExp engine (no Oniguruma WASM, ~150 KiB brotli removed), Framer Motion is gone (replaced by CSS, ~90 KiB brotli removed), and the Plate editor is `React.lazy`-deferred so it no longer blocks first paint — which is what collapsed TBT. The remaining LCP gap is dominated by downloading + rendering the `editor` chunk over synthetic Slow 4G; on the localhost embed path real reviewers actually use, download is instant, so the lived experience tracks TBT/TTI, not this LCP. Further LCP gains would require a lightweight read-only markdown first paint that upgrades to Plate (progressive enhancement) and trimming the Plate-internal markdown stack (`acorn`/MDX, `lodash`), both deferred.

## Reporting

`.github/workflows/perf.yml` runs on every PR (and on `push` to `main`), builds the viewer, runs the same `bundle-analyze` + `perf` scripts that you'd run locally, and posts a single sticky comment (`Perf` header) on the PR with bundle and Lighthouse deltas against the latest successful `main` snapshot. The workflow always exits `0` — regressions surface as commentary, not as a merge block. The hard-fail gate is deliberately deferred (see `Deferred` below).

Conventions used in the comment, kept consistent so the numbers are stable to read across PRs:

- **Bundle sizes** are in **KiB** (binary, 1024 bytes), one decimal place.
- **Lighthouse timings** (LCP, TBT, TTI) are in **ms**, rounded to the nearest 10 ms once values exceed 1,000 ms (otherwise to 1 ms). CLS is shown to three decimals.
- **Lighthouse scores** (Performance, Accessibility) render as 0-100 integers, matching how Lighthouse itself reports them.
- **Noise floor.** A delta has to clear an absolute _and_ (where applicable) a relative threshold to count as a regression. Inside the floor the Δ column renders `≈ 0` rather than a signed number, so reviewers don't chase sub-noise variance. Initial bands (kept deliberately wide while we collect variance data):

  | Metric                | Band                   |
  | --------------------- | ---------------------- |
  | Bundle (raw/gzip/br)  | ≥ 1 KiB **and** ≥ 5%   |
  | LH Performance / A11y | ≥ 3 points             |
  | LH LCP / TBT / TTI    | ≥ 200 ms **and** ≥ 10% |
  | CLS                   | ≥ 0.01 absolute        |

- **Verdict prefix** (first line of the comment) summarises the run at a glance:
  - ✅ `within budget` — every metric is inside the noise floor or moved in the favorable direction. Default state.
  - ⚠️ `warning — N metric(s) regressed (no hard-fail yet)` — at least one metric crossed its band in the unfavorable direction. A `**Regressions**` bullet list follows, naming each breached metric (old → new, Δ, and the band it crossed).
  - 🆕 `no baseline available` — the latest five successful `main` runs all lack a usable artifact (typical for the very first PR after this workflow merges). Head measurements still render; the Δ column shows `—` until the next `main` run uploads a baseline.
  - 💔 `Lighthouse measurement failed` — the LH step errored (Chrome flake, timeout, etc.). The bundle table still renders; the LH table is replaced by a single line pointing at the workflow log.

- **Status column** (per row, leftmost in each table) shows whether this PR moved the metric in a meaningful direction:
  - 🟢 inside the noise floor, OR a meaningful improvement
  - 🔴 regression (crossed the band in the unfavorable direction)
  - ⚪ no baseline available — head value rendered without comparison

- **Target column** (Lighthouse table only) compares the head value against the documented budget:
  - ✅ head meets target
  - ❌ head misses target
  - 🎯 (with no check) — head is unmeasured but the budget itself applies
  - `—` — no documented budget for this metric (TBT, CLS)

  Targets sourced from this file's `## Targets` section: Performance ≥ 90, Accessibility ≥ 95, LCP and TTI ≤ 1,000 ms. The Target column makes the gap to budget visible on every PR without requiring a regression.

The footer (HTML `<sub>` block) renders the baseline and head short SHAs, the workflow run link, and the artifact filenames. Reviewers can tell when the comparison is against a stale main (long-running branches will need a rebase to pick up newer baselines).

## Deferred

- **`apps/portal` bundle-analyze.** Portal is currently a stub (`build: "echo 'no build yet'"`, single empty `src/index.ts`). Wiring a visualizer there would install a dead devDep on a workspace with no Vite app. Pick this back up once the portal app actually bootstraps.
- **Hard-fail CI gate on regression.** The perf workflow now posts bundle and Lighthouse deltas on every PR; enabling a hard fail on score regression is a separate follow-up, gated on collecting baseline variance data (target: 4 weeks of main-branch runs).

## See also

- [`product.md`](./product.md) — NFR-1 bundle/perf budget.
- [`architecture.md`](./architecture.md) — viewer bundling and the single-file HTML constraint.
