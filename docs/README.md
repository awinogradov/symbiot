# symbiot docs

Architectural reference material. Per-package READMEs live next to their
sources; cross-cutting design notes live here.

| Doc                                                                    | What it covers                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`product.md`](./product.md)                                           | Product goals, non-goals, personas, principles, NFRs, success metrics.                                                                                                                                                  |
| [`architecture.md`](./architecture.md)                                 | App composition, package layering, HTTP surface, monorepo invariants, and the "architectural specials" — non-obvious decisions easy to break by accident.                                                               |
| [`server-contract.md`](./server-contract.md)                           | HTTP surface between the agent hook and the viewer: routes, modes, request/response shapes.                                                                                                                             |
| [`theming.md`](./theming.md)                                           | Annotation color tokens — chosen OKLCH values, hex equivalents, contrast ratios against `--background`, and the WCAG 2.1 methodology used to verify them.                                                               |
| [`a11y.md`](./a11y.md)                                                 | WCAG AA accessibility — axe-core scenarios, keyboard-nav checklist, focus-ring policy, ARIA-label inventory, screen-reader smoke, and AA-contrast cross-reference.                                                      |
| [`perf.md`](./perf.md)                                                 | Performance budget, bundle visualizer, and the Lighthouse reproduction procedure.                                                                                                                                       |
| [`testing.md`](./testing.md)                                           | Unit-test coverage targets, scope, the PR-comment workflow, how to update thresholds, the golden-fixture CI gate, and the Playwright-BDD `data-testid` selector rule.                                                   |
| [`version-history.md`](./version-history.md)                           | On-disk version layout, `/api/plan/version[s]` endpoints, History sidebar tab, read-only `DiffEditor`, Clean / Raw toggle, drift detection sidecars, predecessor-diff overlay, `vscode-diff` endpoint, smoke-test flow. |
| [`release.md`](./release.md)                                           | Release pipeline, hook shim ↔ binary contract, cut and rollback procedure.                                                                                                                                              |
| [`agents/adding-an-integration.md`](./agents/adding-an-integration.md) | How to add a new agent integration: the two integration shapes, the shared `@symbiot/agent-runtime` building blocks, a step-by-step for a stdin-driven CLI hook, and the decision contract.                             |
| [`agents/copilot-contract.md`](./agents/copilot-contract.md)           | GitHub Copilot CLI hook contract audit (issue #67): the `agentStop` stdin/stdout schema, why `preToolUse` is unfit, and the block-until-approve viability verdict with pinned-source citations.                         |

Higher-level material lives at the repo root:

- [`../CLAUDE.md`](../CLAUDE.md) — naming, lint, post-task checks, AI-assistant workflow.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution rules, commit and branch conventions.

Per-area READMEs (each one cites the docs above where relevant):

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
