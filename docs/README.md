# symbiot docs

Architectural reference material, organized as numbered chapters. Per-package
READMEs live next to their sources; cross-cutting design notes live here.

| Chapter                                                              | What it covers                                                                                                                                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-product.md`](./01-product.md)                                   | Product goals, non-goals, personas, principles, NFRs, success metrics.                                                                                                                                                  |
| [`02-architecture.md`](./02-architecture.md)                         | App composition, package layering, HTTP surface, monorepo invariants, and the "architectural specials" — non-obvious decisions easy to break by accident.                                                               |
| [`03-server-contract.md`](./03-server-contract.md)                   | HTTP surface between the agent hook and the viewer: routes, modes, request/response shapes.                                                                                                                             |
| [`04-version-history.md`](./04-version-history.md)                   | On-disk version layout, `/api/plan/version[s]` endpoints, History sidebar tab, read-only `DiffEditor`, Clean / Raw toggle, drift detection sidecars, predecessor-diff overlay, `vscode-diff` endpoint, smoke-test flow. |
| [`05-theming.md`](./05-theming.md)                                   | Annotation color tokens — chosen OKLCH values, hex equivalents, contrast ratios against `--background`, and the WCAG 2.1 methodology used to verify them.                                                               |
| [`06-a11y.md`](./06-a11y.md)                                         | WCAG AA accessibility — axe-core scenarios, keyboard-nav checklist, focus-ring policy, ARIA-label inventory, screen-reader smoke, reduced motion, and AA-contrast cross-reference.                                      |
| [`07-perf.md`](./07-perf.md)                                         | Performance budget, bundle visualizer, and the Lighthouse reproduction procedure.                                                                                                                                       |
| [`08-testing.md`](./08-testing.md)                                   | Unit-test coverage targets, scope, the PR-comment workflow, how to update thresholds, the golden-fixture CI gate, and the Playwright-BDD `data-testid` selector rule.                                                   |
| [`09-release.md`](./09-release.md)                                   | Release pipeline, hook shim ↔ binary contract, cut and rollback procedure.                                                                                                                                              |
| [`10-add-agent-integration.md`](./10-add-agent-integration.md)       | How to add a new agent integration: the integration shapes, the shared `@symbiot/agent-runtime` building blocks, a step-by-step for a stdin-driven CLI hook, and the decision contract.                                 |
| [`appendix-a-copilot-contract.md`](./appendix-a-copilot-contract.md) | GitHub Copilot CLI hook contract audit (issue #67): the `agentStop` stdin/stdout schema, why `preToolUse` is unfit, and the block-until-approve viability verdict with pinned-source citations.                         |

Higher-level material lives at the repo root:

- [`../CLAUDE.md`](../CLAUDE.md) — naming, lint, post-task checks, AI-assistant workflow.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution rules, commit and branch conventions.

Per-area READMEs (each one cites the chapters above where relevant):

- [`../apps/viewer/README.md`](../apps/viewer/README.md)
- [`../apps/claude-code/README.md`](../apps/claude-code/README.md)
- [`../apps/codex/README.md`](../apps/codex/README.md)
- [`../apps/gemini/README.md`](../apps/gemini/README.md)
- [`../apps/copilot/README.md`](../apps/copilot/README.md)
- [`../apps/opencode-plugin/README.md`](../apps/opencode-plugin/README.md)
- [`../apps/portal/README.md`](../apps/portal/README.md)
- [`../packages/symbiot-editor/README.md`](../packages/symbiot-editor/README.md)
- [`../packages/symbiot-ui/README.md`](../packages/symbiot-ui/README.md)
- [`../packages/symbiot-annotations/README.md`](../packages/symbiot-annotations/README.md)
- [`../fixtures/markdown/README.md`](../fixtures/markdown/README.md) — sample markdown fixtures + smoke-test flow.
- [`../fixtures/golden/README.md`](../fixtures/golden/README.md) — annotation-serializer byte-equality regression fixtures.
- [`../features/README.md`](../features/README.md) — Playwright-BDD harness.
