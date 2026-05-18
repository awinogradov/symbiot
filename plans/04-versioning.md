# Phase 4 — Plan version history + inline diff

## Goal

When the agent emits a revised plan, surface a clean inline diff between version N-1 and N using `@platejs/diff`, and keep reviewer annotations anchored across versions. symbiot's diff is **inline** (word/character) rendered as suggestion-style nodes — an upgrade over the line-level diff engines common in plan-review tools.

## Exit criteria

- [ ] Server returns version history (`/api/plan/version`, `/api/plan/versions`, `/api/plan/history`) and per-version markdown from `~/.symbiot/history/{project}/{slug}/00N.md`.
- [ ] Sidebar shows a **Version Browser** section listing `001.md`, `002.md`, … with the current version highlighted.
- [ ] When a previous version exists, the editor renders an inline diff between selected version and its predecessor using `computeDiff()` from `@platejs/diff`, additions/removals as suggestion-style marks (UC2).
- [ ] **Two diff views:**
  - **Clean** (default): changes only with surrounding context.
  - **Raw**: full unified markdown.
  - Toggled via shadcn `Tabs` or `ToggleGroup`.
- [ ] **Diff nodes are namespaced** distinctly from reviewer-authored suggestions (e.g. `data-source="diff"`) — diff nodes cannot be "accepted" as feedback (R-5).
- [ ] Annotations created in version N **remain attached** when navigating to version N+1 where the anchored text still exists. When it doesn't, the codec falls back to text-quote on `originalText` and surfaces "drifted" status in the sidebar.
- [ ] symbiot's diff implementation is **inline-only** (no line-level fallback engine) — `@platejs/diff` is the sole diff source.
- [ ] `POST /api/plan/vscode-diff` available for VS Code / Obsidian "open the diff externally" integration (plannotator-compatible endpoint name).

## Scope

### `packages/symbiot-server`

- Implement `GET /api/plan/version` (single version by number), `GET /api/plan/versions` (list), `GET /api/plan/history` (full).
- Implement `POST /api/plan/vscode-diff` (opens a diff in VS Code; endpoint name kept plannotator-compatible).
- Preserve filesystem layout `~/.symbiot/history/{project}/{slug}/00N.md`.

### `packages/symbiot-editor`

- Integrate `@platejs/diff`. On load, if a previous version is provided, run `computeDiff(previous, current)` and merge the resulting nodes into the rendered value.
- Build the dual diff view (Clean vs Raw) as two render modes of the same value.
- Namespace diff marks via `data-source="diff"` attribute and a separate render component so accept/reject UI is suppressed for them.
- Diff additions/removals visually use the same `--anno-insert` / `--anno-delete` tokens for consistency (per PRD §10), but the suggestion accept/reject affordance is hidden.

### `packages/symbiot-annotations`

- **Anchor-resolution upgrade.** On load:
  1. Try to resolve by Plate path + offset (fast path).
  2. If path is invalid (text shifted), fall back to text-quote search on `originalText`.
  3. If neither resolves, mark the annotation `drifted: true` and surface in the sidebar with a warning badge.
- Test the upgrade across plausible version-diff scenarios (text moved, text deleted, text edited).

### `packages/symbiot-ui`

- Version Browser section in the Sidebar (list of versions, current highlighted).
- Clean / Raw `Tabs` in the diff view.

## Out of scope (deferred)

- **Cross-version annotation editing on a drifted anchor** — beyond detecting drift. Either backlog or a minor Phase 5 task. For now, drifted annotations are read-only in the sidebar.
- **Sharing of version state** — Phase 6.

## Tasks

1. Extend `packages/symbiot-server` with the version endpoints; use the `~/.symbiot/history/{project}/{slug}/00N.md` filesystem layout.
2. Hook in `@platejs/diff`; smoke-test `computeDiff()` against fixture pairs.
3. Implement diff-node namespacing (a Plate plugin that renders `data-source="diff"` marks via a separate component with no accept/reject affordance).
4. Build the Clean vs Raw view toggle.
5. Implement Version Browser in the sidebar.
6. Implement dual-anchor resolution + drift detection in `symbiot-annotations`.
7. Visual styling: ensure diff colors meet the same tokens as annotations (`--anno-insert`, `--anno-delete`).
8. Delete any stub or reference to a `planDiffEngine` if accidentally ported. There must be none.

## Dependencies

- `@platejs/diff`

## Risks / OQs

- **R-2 (anchor drift).** Mitigation: dual anchoring (path + text-quote fallback) implemented here. Tested in this phase.
- **R-5 (diff/suggestion collision).** Mitigation: namespace diff nodes distinctly; never let a diff node be "accepted" as feedback. Verified in tasks 3 + 7.

## Verification

- **Unit (Vitest):** anchor resolve via path; anchor resolve via text-quote fallback when path is invalid; drift detection when neither resolves.
- **Manual:** simulate a plan revision by editing `001.md` / `002.md` directly; navigate versions; verify:
  - Diffs render correctly in both views.
  - Annotations created on `001` follow correctly to `002` when text exists.
  - Annotations on deleted text appear "drifted" in the sidebar.
  - Cannot accept/reject diff nodes (no buttons appear on them).
- **Cross-phase gate (after this phase):** UC2 works. Legacy `planDiffEngine.ts` is gone (grep should return nothing).
