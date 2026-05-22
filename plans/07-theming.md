# Phase 7 — Theming: light / dark, FOUC, AA contrast

## Goal

Productionize theming end-to-end:

- Support `system | light | dark` with OS default and persisted explicit choice.
- Verify **AA contrast** for every annotation token and shadcn surface in both themes.
- **Eliminate FOUC** everywhere — in-app shell and static portal.

The `ThemeProvider` already exists in a minimal form (Phase 2). This phase hardens it, completes the token set, and validates contrast.

## Exit criteria

- [x] `ThemeProvider` supports `system | light | dark`; defaults to `system`; explicit user choice persists to `localStorage` and overrides system (FR-14.1, FR-14.2, FR-14.3).
- [x] Listens for `prefers-color-scheme` change events; updates `.dark` class when in `system` mode and the OS preference changes.
- [x] **Settings dialog** hosts a theme toggle (shadcn `ToggleGroup`: System / Light / Dark).
- [x] All color expressed through shadcn/Tailwind CSS variables (`--background`, `--foreground`, `--muted`, etc.) **plus** annotation tokens `--anno-delete`, `--anno-insert`, `--anno-replace`, `--anno-comment`, each defined for both themes (FR-14.4).
- [x] All four annotation highlight colors meet **WCAG AA contrast** in both themes (FR-14.5, M7) — verified by an automated check (small contrast unit test against resolved CSS variables, or `axe-core` on a rendered fixture).
- [x] **No FOUC** on first paint in the in-app shell **or** the static portal (NFR-9, R-6).
- [x] Diff view tokens (Phase 4) re-themed to reuse annotation tokens for consistency (PRD §10).

## Scope

### `packages/symbiot-ui`

- Harden `ThemeProvider`:
  - Resolves `system` → `light | dark` based on `matchMedia('(prefers-color-scheme: dark)')`.
  - Listens for OS preference changes when in `system` mode.
  - Persists explicit choice to `localStorage` under `symbiot.theme`.
  - Applies `.dark` class to `document.documentElement` synchronously.
- Build the **Settings** dialog (shadcn `Dialog`) — theme toggle is the first occupant; future settings (e.g. author name) can live here too.
- Top-bar Settings button.

### `packages/@symbiot/tailwind-config`

- Complete the design-token set. The placeholder tokens from Phase 1 are replaced with AA-verified hues for both themes:
  - shadcn defaults for foundation tokens (`--background`, `--foreground`, etc.).
  - Annotation tokens `--anno-delete`, `--anno-insert`, `--anno-replace`, `--anno-comment` carefully chosen for AA contrast against `--background` in both themes.

### `apps/portal`

- Solidify the inline pre-paint script (shipped in Phase 6) — read stored theme preference and OS preference, compute the resolved theme, set `.dark` class on `<html>` before first render.
- Mirror the same script in any other Vite app's `index.html` (in-app shell if applicable).

### `packages/symbiot-editor`

- Audit diff and suggestion renderers (from Phases 3 + 4): ensure they consume CSS variables, no hardcoded hex.

## Out of scope

- **Bundle/perf for theme assets** → Phase 8.
- **Storybook visual regression coverage** → backlog.

## Tasks

1. Harden `ThemeProvider`: `system | light | dark` resolution, OS listener, persistence, sync `.dark` class.
2. Build the Settings dialog with the theme toggle.
3. Pick AA-verified hues for the four annotation tokens × two themes. Document each choice with its contrast ratio.
4. Implement an automated contrast unit test: render a fixture with each annotation type, read computed background + foreground via JSDOM or a headless browser, assert `contrastRatio >= 4.5` (AA for normal text).
5. Audit `symbiot-editor` and `symbiot-ui` for hardcoded colors; convert all to CSS variables.
6. Confirm portal FOUC mitigation works: load with Chrome's "Slow 3G" throttle; first paint should already be in the correct theme.
7. Add a visual smoke test (screenshot at first paint in each mode) to catch regressions.

## Dependencies

- shadcn primitive: `dialog` (likely already vendored), `toggle-group` (already in Phase 3)

## Risks / OQs

- **R-6 (portal FOUC).** Fully mitigated here (was partially in Phase 6). Verify with throttled-network test.
- **AA contrast in dark mode** for `--anno-delete` (red) — common failure. Test early.

## Verification

- **Automated:** contrast unit test on all four annotation tokens × both themes.
- **Manual:** toggle theme mid-session in both modes; reload; verify persistence. Set OS preference to dark; ensure app follows when in `system` mode. Set explicit `Light`; ensure it sticks even when OS goes dark.
- **Manual (record video):** reload the portal under throttling — no flash of incorrect theme before first paint.
- **Cross-phase gate (after this phase):** **M7 holds** (AA contrast + no FOUC).
