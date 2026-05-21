# symbiot docs

Architectural reference material. Per-package READMEs live next to their
sources; cross-cutting design notes live here.

| Doc                                          | What it covers                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`architecture.md`](./architecture.md)       | App composition, package layering, HTTP surface, monorepo invariants, and the "architectural specials" — non-obvious decisions easy to break by accident. |
| [`version-history.md`](./version-history.md) | On-disk version layout, `/api/plan/version[s]` endpoints, History sidebar tab, read-only `DiffEditor`, Clean / Raw toggle, smoke-test flow.               |

Higher-level material lives at the repo root:

- [`../PRD.md`](../PRD.md) — product requirements.
- [`../CLAUDE.md`](../CLAUDE.md) — naming, lint, post-task checks, AI-assistant workflow.
- [`../plans/README.md`](../plans/README.md) — phase ledger (status, scope, goals).

Per-area READMEs (each one cites the docs above where relevant):

- [`../apps/viewer/README.md`](../apps/viewer/README.md)
- [`../apps/hook/README.md`](../apps/hook/README.md)
- [`../packages/symbiot-editor/README.md`](../packages/symbiot-editor/README.md)
- [`../packages/symbiot-ui/README.md`](../packages/symbiot-ui/README.md)
- [`../packages/symbiot-annotations/README.md`](../packages/symbiot-annotations/README.md)
- [`../fixtures/plans/README.md`](../fixtures/plans/README.md) — smoke fixtures + diff smoke flow.
- [`../features/README.md`](../features/README.md) — Playwright-BDD harness.
