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

Runs `vite build` for the viewer with the `rollup-plugin-visualizer` plugin enabled (gated by `SYMBIOT_BUNDLE_ANALYZE=1`). The visualizer hooks into the same Rollup pass that produces the shipped single-file HTML, so the numbers in the report match what `viteSingleFile` actually inlines.

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

Captured 2026-05-24 against `fixtures/markdown/elements.md` (~1 KB markdown) on commit `b3dc798` of `main`.

- **Bundle** (viewer single-file HTML, `apps/viewer/dist/client/index.html`):
  - **3,396.5 KB raw · 857.2 KB gzipped · 602.5 KB brotli**
  - Treemap source of truth: `apps/viewer/bundle-stats/index.html`
- **Lighthouse** (default mobile profile, simulated Slow 4G + 4× CPU):
  - **Performance: 39** — below the ≥ 90 target. Expected for the current bundle (no editor lazy-load, no highlight-language code-split yet).
  - **Accessibility: 100** — already above the ≥ 95 target.
  - LCP: 18,350 ms · TBT: 642 ms · CLS: 0.000 · TTI: 18,728 ms

The full viewer ships Plate kits, shadcn UI, history/diff/share/theming code, etc. Closing the gap to NFR-1 requires editor lazy-loading, code-splitting highlight languages, and tree-shaking unused Plate kits.

## Deferred

- **`apps/portal` bundle-analyze.** Portal is currently a stub (`build: "echo 'no build yet'"`, single empty `src/index.ts`). Wiring a visualizer there would install a dead devDep on a workspace with no Vite app. Pick this back up once the portal app actually bootstraps.
- **CI gate on regression.** Baseline reporting first; a hard CI fail on score regression is tracked separately.

## See also

- [`product.md`](./product.md) — NFR-1 bundle/perf budget.
- [`architecture.md`](./architecture.md) — viewer bundling and the single-file HTML constraint.
