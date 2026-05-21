# `features/` — Playwright-BDD specs

End-to-end coverage for `apps/viewer`. Scenarios drive the real browser against a built viewer auto-launched by Playwright's `webServer` block.

## Layout

```
features/
├── README.md            ← this file
├── support/             ← pure-function helpers (no class state)
│   ├── world.ts         ← shared paths / constants
│   └── fixtures.ts      ← decision-file reset + wait helpers
├── steps/               ← step definitions (Given/When/Then)
│   ├── navigation.steps.ts
│   └── approve.steps.ts
└── <area>/
    └── <behavior>.feature
```

Naming: `features/<area>/<behavior>.feature`. Areas correspond to user-facing surfaces: `plan-review/`, `markdown/`, `annotate/`, `server/`.

## Conventions (enforced by review)

- **Selectors are `data-testid="<kebab-case>"` only.** Never select by class, text content, or role. Phase 2 introduces `top-bar`, `top-bar-approve`, `top-bar-deny`, `editor-root`. Each new component adds its own testids.
- **Step helpers are pure functions.** No class state, no shared mutable singletons. Pass everything through arguments or the `world.ts` constants.
- **ES module imports require `.ts` extensions** (per `tsconfig.json`). The harness runs under Bun.
- **One concept per scenario.** Don't pile assertions; if you need a second behaviour, write a second scenario.

## Running

```sh
bun run test:e2e        # bddgen + headless chromium
bun run test:e2e:ui     # interactive debugger (Playwright UI)
```

First run requires Chromium:

```sh
SYMBIOT_INSTALL_BROWSER=1 bunx playwright install chromium
```

(Postinstall pulls Chromium only when `SYMBIOT_INSTALL_BROWSER=1`; CI wiring lands in Phase 8.)

### With coverage

```sh
bun run test:e2e:coverage
```

Runs the scenarios with `COVERAGE=1`. The shared fixture in `features/support/bdd.ts` captures Playwright V8 coverage per scenario, dumps it to `coverage/raw/<testId>.json`, then `mcr-generate.ts` aggregates everything through `monocart-coverage-reports` (configured in `mcr.config.ts`) into `coverage/e2e/index.html` (HTML drilldown) and `coverage/e2e/lcov.info` (CI consumption). Source maps emitted by the viewer's Vite build are resolved from disk, so reported paths land on the `.ts` / `.tsx` sources, not the bundled chunks. The generator runs under Node — `monocart-coverage-reports` calls `v8.setFlagsFromString`, which Bun does not implement.

## Adding a new scenario

1. Pick or create a `features/<area>/<behavior>.feature` file. Add `data-testid` on every new interactive element in the component source.
2. Add step definitions under `features/steps/<area>.steps.ts`. Reuse helpers from `features/support/`.
3. Run `bun run test:e2e:ui` to debug the scenario step-by-step.
4. Commit the `.feature` and step file together. Never commit `.features-generated/`.

## Decision marker

The viewer's `/api/approve` and `/api/deny` routes write the most recent decision to `.features-generated/last-decision.json` when run with `--decision-file`. Scenarios reset the file at the start (`resetDecisionFile`) and read it after the action (`waitForDecision`). This lets the test assert on the agent-side IPC without driving the hook process itself.
