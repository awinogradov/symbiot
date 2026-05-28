# `features/` — Playwright-BDD specs

End-to-end coverage for `apps/viewer`. Scenarios drive the real browser
against a built viewer auto-launched by Playwright's `webServer` block.

## Layout

```
features/
├── README.md            ← this file
├── support/             ← pure-function helpers (no class state)
│   ├── world.ts         ← shared paths / constants
│   ├── fixtures.ts      ← decision-file reset + wait helpers
│   ├── bdd.ts           ← Playwright fixture that captures V8 coverage per scenario
│   └── testAssets.ts    ← seed bytes + fixture slugs
├── steps/               ← step definitions (Given/When/Then), grouped by behaviour
│   ├── navigation.steps.ts
│   ├── approve.steps.ts
│   └── ...
└── <story>/
    └── <behavior>.feature
```

Feature folders are keyed to the **story IDs in [`docs/product.md`](../docs/product.md)**
(personas `P1`–`P3`, use cases `UC1`–`UC4`, non-functional requirements `NFR-1`..`NFR-9`),
not to UI surfaces. Each `.feature` lives in exactly one story folder — its primary
journey — so per-persona coverage gaps are visible at the directory level.

| Folder                    | Story                                                    |
| ------------------------- | -------------------------------------------------------- |
| `uc1-review-and-approve/` | UC1 — review, annotate, approve / request changes (P1)   |
| `uc2-version-diff/`       | UC2 — inline diff between plan versions (P1)             |
| `uc3-annotate-doc/`       | UC3 — annotate an arbitrary markdown document (P1)       |
| `nfr-a11y/`               | NFR-5 — accessibility baseline                           |
| `nfr-theming/`            | NFR-9 — theming integrity, no FOUC                       |
| `nfr-markdown-fidelity/`  | NFR-4 — deterministic markdown rendering / round-trip    |
| `nfr-upload-security/`    | NFR-3 — upload contract & zero-knowledge guarantees (P3) |
| `diagnostics/`            | Cross-cutting dev diagnostics (no product-spec ID)       |

> **UC4 (share → import → respond, persona P2) has no folder yet** — there are no
> scenarios for it. That gap is intentional and visible; filling it is tracked as a
> separate per-story issue, not part of this layout.

`steps/` and `support/` are **not** keyed by story — step definitions stay grouped by
behaviour and are shared across stories.

## Tagging

Every `.feature` carries a **feature-level tag line directly above `Feature:`**, so the
tag applies to all scenarios in the file. Tags use the stable IDs from
[`docs/product.md`](../docs/product.md):

- `@P<n>` — persona (`@P1`, `@P2`, `@P3`)
- `@UC<n>` — use case (`@UC1`..`@UC4`)
- `@NFR-<n>` — non-functional requirement (`@NFR-3`, `@NFR-5`, `@NFR-9`, …)

A file may carry a secondary `@UC<n>` tag when it incidentally exercises another story
(e.g. `drift-detection.feature` is `@P1 @UC1 @UC2`). Cross-cutting buckets without a
product-spec ID use a folder-matching tag (`diagnostics/` → `@diagnostics`).

## Conventions (enforced by review)

- **Selectors are `data-testid` only** — full rule, naming, and placement live in [docs/testing.md § Playwright-BDD selectors](../docs/testing.md#playwright-bdd-selectors). Every interactive component adds its own testids.
- **Step helpers are pure functions.** No class state, no shared mutable singletons. Pass everything through arguments or the `world.ts` constants.
- **ES module imports require `.ts` extensions** (per `tsconfig.json`). The harness runs under Bun.
- **One concept per scenario.** Don't pile assertions; if you need a second behaviour, write a second scenario.
- **No time-based waits.** Wait on a selector, an assertion, or `waitForFunction` — never on the clock. Wall-clock waits flake under CI load and hide real regressions; see `eslint.config.ts` and `.github/workflows/pr.yml` for the guards.

## Running

```sh
bun run test:e2e        # bddgen + headless chromium
bun run test:e2e:ui     # interactive debugger (Playwright UI)
```

### Running one story or persona

`playwright-bdd` filters scenarios at generation time via `bddgen --tags`. The
`test:e2e:story` script wraps that — pass a tag expression through the `STORY` env var:

```sh
STORY=@UC1 bun run test:e2e:story            # only UC1 scenarios
STORY=@P1  bun run test:e2e:story            # everything persona P1 touches
STORY="@P1 and not @UC2" bun run test:e2e:story
```

`STORY` is required — an unset or empty value fails fast (an empty tag expression would
otherwise match every scenario). For ad-hoc runs the raw form is equivalent:

```sh
bddgen --tags "@UC4" && playwright test
```

First run requires Chromium:

```sh
SYMBIOT_INSTALL_BROWSER=1 bunx playwright install chromium
```

(Postinstall pulls Chromium only when `SYMBIOT_INSTALL_BROWSER=1`.)

### With coverage

```sh
bun run test:e2e:coverage
```

Runs the scenarios with `COVERAGE=1`. The shared fixture in
`features/support/bdd.ts` captures Playwright V8 coverage per scenario,
dumps it to `coverage/raw/<testId>.json`, then `mcr-generate.ts`
aggregates everything through `monocart-coverage-reports` (configured in
`mcr.config.ts`) into `coverage/e2e/index.html` (HTML drilldown) and
`coverage/e2e/lcov.info` (CI consumption). Source maps emitted by the
viewer's Vite build are resolved from disk, so reported paths land on the
`.ts` / `.tsx` sources, not the bundled chunks. The generator runs under
Node — `monocart-coverage-reports` calls `v8.setFlagsFromString`, which
Bun does not implement.

## Adding a new scenario

1. Pick or create a `features/<story>/<behavior>.feature` file under the folder for the story it covers (see the table above), and add the matching feature-level tag line above `Feature:`. Add `data-testid` on every new interactive element in the component source.
2. Add step definitions under `features/steps/<behavior>.steps.ts` — steps are grouped by behaviour, not by story. Reuse helpers from `features/support/`.
3. Run `bun run test:e2e:ui` to debug the scenario step-by-step.
4. Commit the `.feature` and step file together. Never commit `.features-generated/`.

## Decision marker

The viewer's `/api/approve` and `/api/deny` routes write the most recent
decision to `.features-generated/last-decision.json` when run with
`--decision-file`. Scenarios reset the file at the start
(`resetDecisionFile`) and read it after the action (`waitForDecision`).
This lets the test assert on the agent-side IPC without driving the hook
process itself.
