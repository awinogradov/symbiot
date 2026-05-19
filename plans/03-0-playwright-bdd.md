# Phase 3.0 — Playwright-BDD scaffolding

> **Status:** 🟢 Complete (2026-05-19). The harness is live and 14/14 scenarios pass across the four sub-phases. First sub-phase of Phase 3 — adds an end-to-end test harness against the Phase 2 shipped feature surface, before any new feature work in 3.1+ lands. The remaining Phase 3 sub-phases (3.1 / 3.2 / 3.3) each ship `.feature` specs alongside their code.

## Goal

Stand up a Playwright-BDD harness that exercises `apps/viewer` end-to-end from a real browser, so every subsequent Phase 3 sub-phase ships scenario-level coverage of its new behavior. CLAUDE.md §10.4 already commits the project to Playwright-BDD (`features/` directory, pure-function helpers, `data-testid` selectors, ES-module `.js` imports) — this sub-phase implements that contract.

The harness boots the viewer in a non-interactive server mode against `fixtures/plans/elements.md`, drives a single smoke scenario (`Approve` round-trips a decision), and proves the conventions that 3.1–3.3 will follow. CI wiring is deliberately deferred to Phase 8.

## Exit criteria

- [x] `bun run test:e2e` from a fresh clone runs `playwright-bdd` codegen and Playwright tests; the smoke scenario passes against a freshly-built viewer.
- [x] `playwright.config.ts` exists at the repo root. **(Deviation from plan: `bddgen` config is merged into `playwright.config.ts` via `defineBddConfig()` — no separate `bddgen.config.ts` file.)**
- [x] `features/plan-review/approve.feature` exists and is green.
- [x] `features/README.md` documents the convention (one-page).
- [x] `apps/viewer` accepts `--no-open`, `--keep-alive`, `--port`, `--decision-file` flags so the Playwright `webServer` block can drive it.
- [x] `data-testid` attributes added to all Phase-2-shipped interactive elements that the smoke spec needs: `top-bar`, `top-bar-approve`, `top-bar-deny`, `editor-root`.
- [x] Pure-function step helpers per CLAUDE.md §10.4; no class state in `features/support/*`.
- [x] `.features-generated/`, `test-results/`, `playwright-report/` ignored from git.

## Scope

### Workspace root

- Install dev deps (pinned exact versions per CLAUDE.md §13): `@playwright/test@1.60.0`, `playwright-bdd@8.5.1`. Chromium is **not** auto-installed by `postinstall`; first-time E2E runs require `bunx playwright install chromium` manually. (The original plan called for a `SYMBIOT_INSTALL_BROWSER=1` postinstall gate; it was descoped as unnecessary and the dev runs `playwright install` once on their own.)
- `playwright.config.ts` at the repo root:
  - `defineBddConfig({ features, steps, outputDir: '.features-generated' })` called at the top; the returned `testDir` is wired into `defineConfig`.
  - Single `chromium` project with `viewport: { width: 1280, height: 800 }`.
  - `webServer` is an array — two viewer instances: `plan` mode on port 3210 and `annotate` mode on port 3211 (the second was added in 3.3 to support `features/annotate/round-trip.feature`).
  - Each `webServer` command: `bun apps/viewer/src/bin.ts --plan <fixture> --port <n> --no-open --keep-alive --decision-file <path> --mode <plan|annotate>`.
  - `use.baseURL: 'http://127.0.0.1:3210'`.
- Root `package.json`: `test:e2e` script runs `bddgen && playwright test`. `test:e2e:ui` runs the same with `--ui`.
- `turbo.json`: registers `test:e2e` with `dependsOn: ["^build"], cache: false` (Playwright is slow and stateful).
- `.gitignore`: adds `.features-generated/`, `test-results/`, `playwright-report/`.

### `features/` directory layout

```
features/
├── README.md
├── plan-review/
│   └── approve.feature
├── steps/
│   ├── approve.steps.ts
│   └── navigation.steps.ts
└── support/
    ├── fixtures.ts
    └── world.ts
```

- `features/support/world.ts` — repo-relative paths for the decision-marker files (plan + annotate). Pure functions / constants only.
- `features/support/fixtures.ts` — pure helpers: `resetDecisionFile`, `readDecision`, `waitForDecision`.
- `features/steps/navigation.steps.ts` — `Given I open the viewer` step that navigates to `baseURL`, waits for `[data-testid="editor-root"]`, and resets the decision file.
- `features/steps/approve.steps.ts` — `When I click Approve`, `When I click Request changes`, `Then the recorded decision is {string}`.
- `features/plan-review/approve.feature` — single smoke scenario.

### `apps/viewer`

Viewer CLI lives at `apps/viewer/src/bin.ts` (not `src/server/cli.ts` as the original plan implied). Flags added:

- `--no-open` — skip `openBrowser.ts`.
- `--keep-alive` — after Approve/Deny, write the decision to a marker file (the path supplied via `--decision-file`) and keep the process listening so subsequent scenarios can drive the same server. SIGINT / SIGTERM exit gracefully.
- `--plan <path>` — pass the markdown plan in (replaces stdin pipe for E2E).
- `--decision-file <path>` — JSON marker the routes write on each decision. Read by the Playwright steps.
- `--port <n>` — bind to a known port instead of the OS-assigned one.
- `--mode <plan|annotate>` — operating mode of the viewer; added in 3.3 but the flag lives on the same CLI.

### `packages/symbiot-ui`

- `TopBar.tsx` — adds `data-testid="top-bar"` on the root, `data-testid="top-bar-approve"` on the Approve button, `data-testid="top-bar-deny"` on the Request-changes button.

### `packages/symbiot-editor`

- `ReviewEditor.tsx` — adds `data-testid="editor-root"` on the `prose` wrapper div.

## Out of scope (deferred)

- CI wiring for `test:e2e` → Phase 8.
- Coverage of any annotation type beyond observing the Phase-2 Approve loop → 3.1+ each add their own `.feature`s.
- Cross-browser (Firefox / Safari) → Phase 8.
- Headed-vs-headless balance, retry / flake policy → Phase 8.
- Visual-regression / screenshot diffing → backlog.
- `SYMBIOT_INSTALL_BROWSER` postinstall gate — descoped; devs run `bunx playwright install chromium` once manually.

## Tasks (executed)

1. Install Playwright + `playwright-bdd` (pinned exact). ✓
2. Add `--no-open`, `--keep-alive`, `--port`, `--decision-file` to the viewer CLI (`apps/viewer/src/bin.ts`). Write the resolved decision to a marker file. ✓
3. Add `data-testid` attributes to `TopBar.tsx` and `ReviewEditor.tsx`. ✓
4. Create `playwright.config.ts` with embedded `defineBddConfig()`. ✓ *(No separate `bddgen.config.ts` — merged.)*
5. Create `features/support/world.ts`, `features/support/fixtures.ts` (pure helpers). ✓
6. Create the two step files (`navigation.steps.ts`, `approve.steps.ts`). ✓
7. Write `features/plan-review/approve.feature` (one scenario). ✓
8. Write `features/README.md` documenting the convention. ✓
9. Wire `test:e2e` script in root `package.json` and `turbo.json`. Update `.gitignore`. ✓
10. Run `bun run test:e2e` from a fresh shell; confirm green. ✓

## Files to create / touch (final state)

| Package / dir | Files |
|---|---|
| repo root | **`playwright.config.ts`** (with embedded `defineBddConfig`), `package.json`, `turbo.json`, `.gitignore`, `tsconfig.json` (extended to include `playwright.config.ts` and `features/**/*.ts`) |
| `features/` | **`README.md`**, **`support/world.ts`**, **`support/fixtures.ts`**, **`steps/navigation.steps.ts`**, **`steps/approve.steps.ts`**, **`plan-review/approve.feature`** |
| `apps/viewer` | `src/bin.ts`, `src/server/startServer.ts`, `src/server/routes.ts` (decision-file persistence on Approve/Deny) |
| `packages/symbiot-ui` | `src/TopBar.tsx` |
| `packages/symbiot-editor` | `src/ReviewEditor.tsx` |

Bold = new file.

## Dependencies (pinned)

- `@playwright/test@1.60.0`
- `playwright-bdd@8.5.1`

## Risks / open questions

- **Playwright `webServer` lifecycle.** The Phase-2 viewer auto-opens a browser via `openBrowser.ts` and exits on Approve. For E2E we need server-mode flags (`--no-open`, `--keep-alive`) — those land in this sub-phase. Without them, Playwright fights the viewer for the same port and the server dies mid-scenario. *(Resolved.)*
- **Decision marker file vs in-test API call.** Reading a marker file (path supplied via `--decision-file`) is simpler than driving the agent-side IPC. The marker file is for tests only; production hook flow is unaffected. *(In place.)*
- **Browser binary distribution.** `bunx playwright install chromium` adds ~150MB and several seconds to first install. The original plan proposed gating this behind `SYMBIOT_INSTALL_BROWSER=1` in `postinstall`; in practice the cost is paid manually once by anyone running `test:e2e`, so the gate was descoped.
- **`bddgen` ↔ `vitest` collision.** `playwright-bdd` writes generated specs into `.features-generated/`. Vitest's default `include` glob does not match that path, so no exclusion was required.

## Verification

```sh
bun install
bunx playwright install chromium     # one-time, manual
bun run build
bun run test:e2e
```

Expected: `bddgen` emits one spec under `.features-generated/`; Playwright runs the `approve.feature` scenario against the auto-started viewer; the decision-marker file contains `{"kind":"approve",…}`; test passes.

Manual debugging: `bun run test:e2e:ui` opens the Playwright UI; step through the scenario, inspect DOM snapshots, confirm the `data-testid` selectors all resolve.
