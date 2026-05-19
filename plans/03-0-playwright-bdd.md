# Phase 3.0 — Playwright-BDD scaffolding

> First sub-phase of Phase 3. Adds an end-to-end test harness against the Phase 2 shipped feature surface, before any new feature work in 3.1+ lands. The remaining Phase 3 sub-phases (3.1 / 3.2 / 3.3) each ship `.feature` specs alongside their code.

## Goal

Stand up a Playwright-BDD harness that exercises `apps/viewer` end-to-end from a real browser, so every subsequent Phase 3 sub-phase ships scenario-level coverage of its new behavior. CLAUDE.md §10.4 already commits the project to Playwright-BDD (`features/` directory, pure-function helpers, `data-testid` selectors, ES-module `.js` imports) — this sub-phase implements that contract.

The harness boots the viewer in a non-interactive server mode against `fixtures/plans/elements.md`, drives a single smoke scenario (`Approve` round-trips a decision), and proves the conventions that 3.1–3.3 will follow. CI wiring is deliberately deferred to Phase 8.

## Exit criteria

- [ ] `bun run test:e2e` from a fresh clone runs `playwright-bdd` codegen and Playwright tests; the smoke scenario passes against a freshly-built viewer.
- [ ] `playwright.config.ts` and `bddgen.config.ts` exist at the repo root.
- [ ] `features/plan-review/approve.feature` exists and is green.
- [ ] `features/README.md` documents the convention (one-page).
- [ ] `apps/viewer` accepts a `--no-open` and `--keep-alive` flag so the Playwright `webServer` block can drive it without auto-launching a browser or exiting on Approve.
- [ ] `data-testid` attributes added to all Phase-2-shipped interactive elements that the smoke spec needs: `top-bar`, `top-bar-approve`, `top-bar-deny`, `editor-root`.
- [ ] Pure-function step helpers per CLAUDE.md §10.4; no class state in `features/support/*`.
- [ ] `.features-generated/`, `test-results/`, `playwright-report/` ignored from git.

## Scope

### Workspace root

- Install dev deps (pinned exact versions per CLAUDE.md §13): `@playwright/test`, `playwright-bdd`. Bun's `postinstall` script runs `bunx playwright install chromium` only when env var `SYMBIOT_INSTALL_BROWSER=1` is set (so CI in Phase 8 controls when it pulls the browser binary).
- `playwright.config.ts` at the repo root:
  - `testDir: '.features-generated'` (where playwright-bdd emits generated specs).
  - Single `chromium` project with `viewport: { width: 1280, height: 800 }`.
  - `webServer` block runs `bun apps/viewer/src/server/cli.ts serve --plan fixtures/plans/elements.md --port 3210 --no-open --keep-alive` and waits on the port; `reuseExistingServer: !process.env.CI`.
  - `use.baseURL: 'http://127.0.0.1:3210'`.
- `bddgen.config.ts`: `features: ['features/**/*.feature']`, `steps: ['features/steps/**/*.ts']`, `outputDir: '.features-generated'`.
- Root `package.json`: add `test:e2e` script: `bddgen && playwright test`. Add `test:e2e:ui` script: `bddgen && playwright test --ui`.
- `turbo.json`: register `test:e2e` with `dependsOn: ["^build"]`, `cache: false` (Playwright is slow and stateful).
- `.gitignore`: add `.features-generated/`, `test-results/`, `playwright-report/`.

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

- `features/support/world.ts` — type for the shared test context (running viewer URL, temp `~/.symbiot/` overlay path, decision-marker path).
- `features/support/fixtures.ts` — pure helpers that build a temp `~/.symbiot/` overlay dir, write fixture plans, and clean up. Pure functions only.
- `features/steps/navigation.steps.ts` — `Given I open the viewer for plan {string}` step that navigates to `baseURL` and waits for `[data-testid="editor-root"]`.
- `features/steps/approve.steps.ts` — `When I click {string}` and `Then the decision marker contains exit code {int}` steps.
- `features/plan-review/approve.feature` — single smoke scenario.

### `apps/viewer`

- Add CLI flags to `apps/viewer/src/server/cli.ts`:
  - `--no-open` — skip `openBrowser.ts`.
  - `--keep-alive` — after Approve/Deny, write the decision to a marker file (`SYMBIOT_DECISION_FILE` env var path, defaults to `<dataDir>/last-decision.json`) instead of exiting. The Playwright test reads that file and `webServer.gracefulShutdown` cleans up.
  - `--plan <path>` — already implicit in `viewer:smoke` for Phase 2; formalize as a flag here.

### `packages/symbiot-ui`

- `TopBar.tsx` — add `data-testid="top-bar"` on the root, `data-testid="top-bar-approve"` on the Approve button, `data-testid="top-bar-deny"` on the Request-changes button.

### `packages/symbiot-editor`

- `ReviewEditor.tsx` — add `data-testid="editor-root"` on the `prose` wrapper div.

## Out of scope (deferred)

- CI wiring for `test:e2e` → Phase 8.
- Coverage of any annotation type beyond observing the Phase-2 Approve loop → 3.1+ each add their own `.feature`s.
- Cross-browser (Firefox / Safari) → Phase 8.
- Headed-vs-headless balance, retry / flake policy → Phase 8.
- Visual-regression / screenshot diffing → backlog.

## Tasks

1. Install Playwright + `playwright-bdd` (pinned exact). Add `bunx playwright install chromium` to `postinstall` behind `SYMBIOT_INSTALL_BROWSER=1`.
2. Add `--no-open` and `--keep-alive` to the viewer CLI. Write the resolved decision to a marker file under `--keep-alive` instead of exiting.
3. Add `data-testid` attributes to `TopBar.tsx` and `ReviewEditor.tsx`.
4. Create `playwright.config.ts` + `bddgen.config.ts`.
5. Create `features/support/world.ts`, `features/support/fixtures.ts` (pure helpers).
6. Create the two step files (`navigation.steps.ts`, `approve.steps.ts`).
7. Write `features/plan-review/approve.feature` (one scenario).
8. Write `features/README.md` documenting the convention.
9. Wire `test:e2e` script in root `package.json` and `turbo.json`. Update `.gitignore`.
10. Run `bun run test:e2e` from a fresh shell; confirm green.

## Files to create / touch

| Package / dir | Files |
|---|---|
| repo root | **`playwright.config.ts`**, **`bddgen.config.ts`**, `package.json`, `turbo.json`, `.gitignore` |
| `features/` | **`README.md`**, **`support/world.ts`**, **`support/fixtures.ts`**, **`steps/navigation.steps.ts`**, **`steps/approve.steps.ts`**, **`plan-review/approve.feature`** |
| `apps/viewer` | `src/server/cli.ts`, `src/server/startServer.ts`, `src/server/openBrowser.ts` (call-site guard) |
| `packages/symbiot-ui` | `src/TopBar.tsx` |
| `packages/symbiot-editor` | `src/ReviewEditor.tsx` |

Bold = new file.

## Dependencies

- `@playwright/test@1.x` (pin exact at install).
- `playwright-bdd@^7` (pin exact at install).

## Risks / open questions

- **Playwright `webServer` lifecycle.** The Phase-2 viewer auto-opens a browser via `openBrowser.ts` and exits on Approve. For E2E we need server-mode flags (`--no-open`, `--keep-alive`) — those land in this sub-phase. Without them, Playwright fights the viewer for the same port and the server dies mid-scenario.
- **Decision marker file vs in-test API call.** Reading a marker file (path passed via `SYMBIOT_DECISION_FILE`) is simpler than driving the agent-side IPC. The marker file is for tests only; production hook flow is unaffected.
- **Browser binary distribution.** `bunx playwright install chromium` adds ~150MB and several seconds to first install. Gated behind `SYMBIOT_INSTALL_BROWSER=1` so it doesn't surprise devs who don't run E2E.
- **`bddgen` ↔ `vitest` collision.** `playwright-bdd` writes generated specs into `.features-generated/`. Make sure `vitest.config.ts` excludes that path (or it's a non-issue since Vitest's `include` doesn't match by default).

## Verification

```sh
bun install
SYMBIOT_INSTALL_BROWSER=1 bun install   # one-time: pulls Chromium
bun run build
bun run test:e2e
```

Expected: `bddgen` emits one spec under `.features-generated/`; Playwright runs the `approve.feature` scenario against the auto-started viewer; the decision-marker file contains `{"decision":"approve"}`; test passes.

Manual debugging: `bun run test:e2e:ui` opens the Playwright UI; step through the scenario, inspect DOM snapshots, confirm the `data-testid` selectors all resolve.
