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

`scripts/perf-lighthouse.ts` boots the built viewer (`apps/viewer/dist/bin.js --plan fixtures/plans/elements.md --no-open --keep-alive`) on a free localhost port, launches headless Chrome via `chrome-launcher`, and runs Lighthouse against it for the `performance` + `accessibility` categories. Headline scores (Performance, Accessibility, LCP, TBT, CLS, TTI) are printed to stdout; the full report lands in `perf-reports/lighthouse-viewer.json` and is git-ignored.

The script returns exit 0 regardless of the scores — this is a reporting tool, not a CI gate. A hard-fail-on-regression gate is a follow-up.

## Baseline

Captured 2026-05-24 against `fixtures/plans/elements.md` (~1 KB markdown) on commit `b3dc798` of `main`.

- **Bundle** (viewer single-file HTML, `apps/viewer/dist/client/index.html`):
  - **3,396.5 KB raw · 857.2 KB gzipped · 602.5 KB brotli**
  - Treemap source of truth: `apps/viewer/bundle-stats/index.html`
- **Lighthouse** (default mobile profile, simulated Slow 4G + 4× CPU):
  - **Performance: 39** — below the ≥ 90 target. Expected for the pre-tuned bundle (no editor lazy-load, no highlight-language code-split yet — both Phase 8 tasks).
  - **Accessibility: 100** — already above the ≥ 95 target.
  - LCP: 18,350 ms · TBT: 642 ms · CLS: 0.000 · TTI: 18,728 ms

The spike (`plans/00-spike.md`) recorded 1,144.9 KB minified / 350.82 KB gzipped outside the monorepo with no code-splitting and a minimal scaffold. The in-repo viewer is heavier because it includes the full editor (Plate kits), shadcn UI, history/diff/share/theming code, etc. Phase 8 tuning (lazy-load editor, code-split highlight languages, tree-shake unused Plate kits) is what closes the gap to NFR-1.

## Deferred

- **`apps/portal` bundle-analyze.** Portal is currently a stub (`build: "echo 'no build yet'"`, single empty `src/index.ts`). Wiring a visualizer there would install a dead devDep on a workspace with no Vite app. Pick this back up once the portal app actually bootstraps.
- **CI gate on regression.** Issue #55 explicitly scoped out a hard CI fail on score regression; baseline reporting first, gate decision later.

## See also

- [`plans/08-hardening.md`](../plans/08-hardening.md) — the parent perf/a11y/CI plan that this tooling unlocks.
- [`plans/00-spike.md`](../plans/00-spike.md) — original 350.82 KB gzipped baseline measurement.
