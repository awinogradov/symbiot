# Product overview

`symbiot` is a markdown plan-review and annotation tool. AI coding agents (Claude Code, Codex, OpenCode, Copilot CLI) emit plans before executing changes; symbiot intercepts those plans, opens a local browser viewer, and lets the human annotate them with comments, deletions, insertions, and replacements before approving or rejecting the change.

The viewer is built on [PlateJS](https://platejs.org): annotations are first-class document marks, not string-offset overlays, so they survive version changes and can overlap cleanly. The surrounding UI is [shadcn/ui](https://ui.shadcn.com) on Tailwind CSS. Storage is the local filesystem under `~/.symbiot/`; sharing is opt-in via an end-to-end-encrypted paste service.

## Goals

- **G1.** Five annotation types (comment, global comment, deletion, insertion, replacement) in two editor modes (Review, Redline). The four body-bearing types are editable in place after creation, preserving their anchor and drift state; deletion stays remove-only.
- **G2.** Full-fidelity markdown rendering with lossless markdown round-trip.
- **G3.** Annotations anchored in the document model — they survive re-rendering and version diffing, and overlap is well-defined.
- **G4.** Plan-version diffing via Plate's inline diff (`@platejs/diff`).
- **G5.** Stable HTTP contract between the agent hook and the viewer.
- **G6.** Optional URL-based sharing with a compact serialized format and E2E-encrypted short links.
- **G7.** Every non-document UI element comes from shadcn/ui on Tailwind.
- **G8.** Light and dark themes, defaulting to the OS preference, with no flash on first paint.
- **G9.** Read-first: the reviewer is reading; editing affordances are deliberate, not ambient.

## Non-goals

- **NG1.** No change to the agent integration mechanism — hook/tool interception and feedback routing stay as designed.
- **NG2.** **No code-review mode.** symbiot does not render git diffs, PRs, file trees, or line-anchored code annotations. Markdown plans and markdown documents only.
- **NG3.** No real-time multiplayer. Sharing is asynchronous (export → import).
- **NG4.** No user accounts, no hosted database. Storage is filesystem + opt-in encrypted paste.
- **NG5.** No paid SaaS dependencies. All editor and UI dependencies are MIT/Apache/BSD.
- **NG6.** No copy of any prior tool's visual styling — symbiot uses its own minimal shadcn-based design system.

## Personas & use cases

- **P1 — Agent-driving developer.** Reviews and redlines plans inline without breaking flow.
- **P2 — Reviewing teammate.** Receives a shared plan URL, adds annotations, sends them back.
- **P3 — Self-hoster.** Runs the paste service and share portal on their own infra; cares about the data contract and zero-knowledge guarantees.

Core flows:

- **UC1.** Agent emits a plan → viewer opens → developer reviews, annotates, approves or requests changes.
- **UC2.** Agent revises a plan → viewer shows an inline diff between version N-1 and N → developer reviews the delta.
- **UC3.** Developer annotates an arbitrary markdown document (`annotate` mode) and routes feedback back to the agent.
- **UC4.** Developer shares an annotated plan; a teammate imports it, adds annotations, shares back.

The persona (`P1`–`P3`), use-case (`UC1`–`UC4`), and `NFR-*` IDs above are **stable anchors**: the Playwright-BDD suite mirrors this taxonomy — feature files are grouped into `features/uc<n>-*/` and `features/nfr-*/` folders and tagged `@P<n>`/`@UC<n>`/`@NFR-<n>`, so per-persona coverage gaps are visible at the directory level (see [`features/README.md`](../features/README.md)). UC4 has no scenarios yet — that gap is intentional and tracked separately.

## Product principles

1. **Read-first, edit-on-intent.** The default surface is a clean rendered document. Annotation tools appear on selection; they never clutter the reading experience.
2. **Annotations are document data.** Every annotation is a node or mark in the Plate value, not an overlay keyed by character offset.
3. **Markdown is the boundary.** Input is markdown, export is markdown, the wire format the agent sees is markdown. The Plate value is an internal representation only.
4. **The model survives versions.** Annotations are anchored by Plate path _and_ an `originalText` text-quote fallback, so a re-rendered or diffed plan keeps annotations meaningful.
5. **Minimal by construction.** All UI elements come from shadcn/ui. No custom-styled chrome where a shadcn primitive exists. Neutral palette, restrained motion, theme-token-driven color.

## Non-functional requirements

| ID    | Requirement                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-1 | Bundle: viewer ships as a single-file HTML (Vite + `vite-plugin-singlefile`). Interactive within 1.5s on a typical plan (<50KB markdown).                          |
| NFR-2 | Offline / zero-network: the share portal makes no network calls when rendering a hash URL.                                                                         |
| NFR-3 | Privacy: no analytics, no tracking, no cookies on the share portal beyond the local theme preference. E2E encryption for short links.                              |
| NFR-4 | Determinism: markdown ↔ Plate and annotation ↔ feedback serialization are deterministic and idempotent.                                                            |
| NFR-5 | Accessibility: keyboard-navigable selection toolbar and sidebar; WCAG AA contrast on annotation colors in both themes.                                             |
| NFR-6 | Browser support: latest Chrome, Edge, Firefox, Safari. `CompressionStream` required for sharing.                                                                   |
| NFR-7 | Licensing: every editor and UI dependency is MIT/Apache/BSD.                                                                                                       |
| NFR-8 | Tests: markdown round-trip, annotation serialize/deserialize, share codec, and diff computation have unit tests; the four annotation flows have integration tests. |
| NFR-9 | Theming integrity: no flash of incorrect theme on first paint, in-app or in the static portal.                                                                     |

> **NFR-6 verification status.** Cross-engine rendering and interaction are verified by the Playwright matrix — Chromium runs the full suite; Firefox and WebKit run the `@smoke` subset (see [`testing.md`](./testing.md)). The `CompressionStream` sharing prerequisite is unit-verified in `packages/symbiot-annotations/src/share.test.ts`. The share-UI graceful-degradation path is not built yet — it is tracked separately in #45/#47 — so NFR-6 sharing support stays **partially verified** until those land.

See also: [`a11y.md`](./a11y.md) for the accessibility baseline, [`perf.md`](./perf.md) for performance budgets and Lighthouse procedure, [`theming.md`](./theming.md) for the color-token contract.

## Success metrics

- **M1.** All five annotation types and both editor modes are reproduced — the feature-parity checklist passes.
- **M2.** Exported feedback markdown is byte-identical to the golden fixtures across the test corpus.
- **M3.** Net reduction in editor-layer LOC vs. the pre-rewrite custom editor.
- **M4.** Share round-trip is lossless across 100% of the corpus.
- **M5.** Viewer bundle meets NFR-1 interactive-time target on the reference fixture.
- **M6.** Zero paid or non-permissive dependencies in the editor and UI stack.
- **M7.** Light and dark themes pass AA contrast checks across every UI and annotation token; no theme FOUC.

## Annotation model

See [`packages/symbiot-annotations/README.md`](../packages/symbiot-annotations/README.md) for the parity contract — every type, its trigger, its PlateJS implementation, its visual token, its compact share tuple, and its exported markdown form.

## See also

- [`architecture.md`](./architecture.md) — app composition, package layering, monorepo invariants.
- [`server-contract.md`](./server-contract.md) — HTTP surface between the hook and the viewer.
- [`version-history.md`](./version-history.md) — on-disk plan-history layout and the version/diff endpoints.
- [`release.md`](./release.md) — release pipeline and the hook shim/binary contract.
