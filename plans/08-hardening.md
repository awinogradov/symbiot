# Phase 8 — Hardening: bundle, a11y, cross-browser, CI

## Goal

Land the non-functional requirements:

- Viewer interactive within **1.5s** on a typical plan, **single-file HTML**.
- **WCAG AA** a11y across the UI.
- **Cross-browser smoke** passes on Chrome, Edge, Firefox, Safari (latest).
- **CI** runs the full lint / typecheck / test / build matrix with Turborepo cache.

## Exit criteria

- [ ] Viewer ships as **single-file HTML** via `vite-plugin-singlefile` (NFR-2).
- [ ] **Interactive within 1.5s** on the reference plan (<50KB markdown) — measured via Lighthouse on a throttled profile (NFR-1, M5).
- [ ] Editor lazy-loaded; syntax-highlighting languages code-split (NFR-1 mitigation).
- [ ] **a11y:**
  - Keyboard-navigable selection toolbar and sidebar (Tab order verified).
  - All annotation actions reachable without a mouse.
  - Visible focus rings.
  - ARIA labels on icon-only buttons.
  - Screen-reader smoke pass on Comment + Delete flows (NFR-5).
- [ ] **Cross-browser smoke:** Chrome, Edge, Firefox, Safari (latest) — manual checklist captured in this file.
- [ ] **CI:** `.github/workflows/ci.yml` runs `bun install && bun run typecheck && bun run lint && bun run test && bun run build` on every PR with Turborepo cache hydration.
- [ ] **Optional CI:** `.github/workflows/golden-files.yml` enforces M2 (byte-compatible feedback markdown vs the captured plannotator reference fixtures for the 3 shared types).
- [ ] Test coverage per NFR-8 met:
  - **Unit:** markdown round-trip, annotation codec, share codec, diff computation.
  - **Integration:** all 5 annotation flows.
- [x] **Licensing audit** confirms every editor + UI dep is MIT/Apache/BSD (NFR-7, M6) — `bun run licenses:audit` enforces the policy and regenerates `LICENSES.md`; wired into `pr.yml`.

## Scope

### Bundle tuning

- Rollup config for the viewer: manual chunks for syntax-highlighting languages.
- Lazy-load `symbiot-editor` and shadcn dialogs.
- Tree-shake unused Plate kit features.
- Bundle analyzer (`rollup-plugin-visualizer` or `vite-bundle-visualizer`) run as the `bundle-analyze` Turborepo task defined in Phase 1.

### a11y audit

- Run `axe-core` against the in-app shell and the portal; capture issues; resolve.
- Manually verify keyboard nav: Tab/Shift-Tab cycles correctly; selection-toolbar actions reachable; Sidebar items operable.
- Visible focus styles audit (CSS).
- ARIA labels on all icon-only buttons.

### Cross-browser

- Smoke test the full plan-review flow + share + portal in Chrome, Edge, Firefox, Safari.
- CompressionStream fallback (NFR-6) verified on Safari versions that lack it.
- Selection-toolbar positioning across browsers.

### CI / CD

- `.github/workflows/ci.yml`:
  - Trigger: PR + push to main.
  - Job: lint + typecheck + test + build (matrix per app/package via Turborepo).
  - Cache Bun's install cache and `.turbo/` keyed by `bun.lock`.
- `.github/workflows/golden-files.yml` (optional): runs the M2 byte-compatible comparison against captured plannotator reference fixtures.

### Licensing audit

- `bun run licenses:audit` invokes `license-checker-rseidelsohn` per workspace, enforces a permissive-only allowlist (`MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0;0BSD;Unlicense`), and regenerates `LICENSES.md`. Pinned via root devDependencies; orchestrated by `scripts/licenses-report.ts`. CI runs it via a dedicated `.github/workflows/licenses.yml` workflow gated on `package.json` (root + workspaces), `bun.lock`, `scripts/licenses-report.ts`, and `LICENSES.md` paths; the step checks `git diff --exit-code -- LICENSES.md` so dep changes that don't regenerate the file fail CI.

## Out of scope

- **Wide agent support** → Phase 9.
- **PRD v1.2 publishing** — follow-up outside this plan series.

## Tasks

1. Configure `vite-plugin-singlefile` for the `apps/viewer` client bundle (and the `apps/portal` bundle).
2. Lazy-load the editor (`React.lazy(() => import('@symbiot/editor'))` at the route level).
3. Code-split highlight languages: import only on detected fenced lang, fallback to plain.
4. Run `axe-core` on each app/page; fix every Critical and Serious issue.
5. Manual keyboard-nav audit: build a checklist, run through it, fix gaps.
6. Cross-browser smoke: build a checklist (load plan, comment, delete, redline, version diff, share, import, theme toggle); run in all four browsers; capture results.
7. CI: write `.github/workflows/ci.yml`; verify a sample PR runs green.
8. Optional CI: write golden-file enforcement workflow.
9. Run Lighthouse on the reference plan; record interactive time. If >1.5s, profile and tune.
10. `bun run licenses:audit` → audit → resolve any non-permissive deps; commit the regenerated `LICENSES.md`.
11. Expand test coverage to NFR-8 targets.

## Dependencies

- `vite-plugin-singlefile` (already added in Phase 6)
- `@axe-core/playwright` or similar for automated a11y checks
- `vite-bundle-visualizer` (devDep)

## Risks / OQs

- **R-1 (bundle size).** This is the final accounting. If we're over 1.5s interactive after tuning, escalate: drop a Plate kit, defer a feature, or accept a higher target.

## Verification

- **Lighthouse** report on the portal and the in-app viewer: capture in this file. Performance, A11y, Best Practices, SEO scores. **Performance ≥ 90; A11y ≥ 95.**
- **axe-core report:** zero Critical / Serious issues.
- **CI matrix:** green on a sample PR.
- **Cross-browser checklist:** all four browsers green.
- **Licenses:** zero non-MIT/Apache/BSD.
- **Cross-phase gate (after this phase):** NFRs 1–9 all pass; M5 (bundle perf) + M6 (licensing) hold.
