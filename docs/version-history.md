# Version history & inline diff

The reviewer can navigate prior plan versions in the right-hand **History**
tab and, on any non-current version, see an inline diff between that version
and its predecessor. This doc covers the storage layout, the server
endpoints, the sidebar tab structure, the read-only diff editor, and the
smoke flow.

## On-disk layout

Every viewer boot writes the plan as a fresh version under:

```
~/.symbiot/history/<project-slug>/<plan-slug>/
  ├── 001.md
  ├── 002.md
  └── 00N.md
```

- `<project-slug>` is derived from the cwd basename via `deriveProjectSlug`.
- `<plan-slug>` is derived from the first H1 in the markdown via
  `derivePlanSlug`. **Two markdown files with the same H1 share the same
  history directory** — this is intentional and the smoke flow depends on it.
- `nextVersionIn` finds `max(NNN) + 1` so each boot increments the version.
- Writes are atomic (write to `.tmp` + `rename`).

Storage helpers: `apps/viewer/src/server/storage.ts`. The relevant exports
are `savePlan`, `loadPlan`, and `listVersions(meta)`.

## Endpoints

```
GET  /api/plan/versions          → { versions: number[], current: number }
GET  /api/plan/version?n=N       → { plan: string, meta: PlanMeta }
```

- `versions` is the ascending list of every NNN.md present on disk for the
  active `{project, slug}`.
- `current` is the boot version (the one being reviewed).
- `version` returns `404` when the requested N is missing, `400` when the
  query string isn't a positive integer (whole-string match against
  `^[1-9]\d*$`).
- The client uses the standard `apiClient` Zod-validated request helper;
  `fetchPlanVersion` adds the `?n=N` query parameter via the new `query`
  option.

## Client state

`apps/viewer/src/client/hooks/useVersionState.ts` owns the slice. The hook
fetches the version list on mount, exposes `activeVersion` / `activePlan` for
the currently rendered version, and lazily fetches `previousPlan` (the
markdown of the predecessor of `activeVersion`).

Key invariants:

- A stale `fetchPlanVersion` response cannot overwrite a newer selection — a
  `latestRequestRef` counter guards against race conditions when the
  reviewer clicks two versions quickly.
- `previousPlan` is **derived** from a `previousFetched` state plus the
  current `previousVersion`: synchronous `setState` calls inside a `useEffect`
  are flagged by the React Compiler lint, so the hook compares
  `previousFetched.version === previousVersion` and exposes `null` when they
  don't match.
- `diffMode: "clean" | "raw"` is persisted to `localStorage.symbiot.diffMode`
  so the reviewer's last choice survives reloads.

## Sidebar layout

```
┌────────────────────────────────────┐
│ Annotations                  [N]   │  ← header + count badge
├────────────────────────────────────┤
│ ┌──────────────┬─────────────────┐ │
│ │ Annotations  │ History         │ │  ← tab bar (only when versions.length ≥ 2)
│ └──────────────┴─────────────────┘ │
│                                    │
│ History tab content:               │
│ ┌─────────────┐                    │
│ │ Clean │ Raw │   ← only when a historical version is active
│ └─────────────┘                    │
│ ● 003.md  current                  │
│ ○ 002.md  ← clicking switches here │
│ ○ 001.md                           │
└────────────────────────────────────┘
```

- `AnnotationSidebar` (`packages/symbiot-ui/src/components/AnnotationSidebar.tsx`)
  controls the tab bar and Clear-all gating.
- `VersionBrowser` lists versions newest-first; the active row gets
  `data-active="true"` via `SidebarMenuButton`'s `isActive` prop and shows
  "current" as its secondary label.
- The Clean / Raw `ToggleGroup` sits above the version list. It is rendered
  only when `showDiffToggle === true`, derived in `ReviewScreen` as
  `isHistorical && previousPlan !== null`. So: not visible on the current
  version; not visible on the smallest version (no predecessor exists).

## Diff editor

`packages/symbiot-editor/src/components/DiffEditor.tsx` is a read-only Plate
editor that renders the diff between two markdown strings via
`@platejs/diff`.

### Pipeline

```
current.md, previous.md
        │
        │  createPlateEditor({ plugins: SymbiotDiffKit })
        │  ─ deserialise both markdown strings
        ▼
prevValue, currValue
        │
        │  computeDiff(prev, curr, { isInline, lineBreakChar: "¶" })
        ▼
fullDiff
        │
        ├── mode === "clean":   pickChangedBlocks(fullDiff)   → only touched blocks
        └── mode === "raw":     fullDiff                       → every block
        │
        │  usePlateEditor({ plugins: SymbiotDiffKit, value })
        ▼
read-only Plate render
```

### Plugin namespacing

The diff plugin is keyed `"diff"` — distinct from the reviewer-authored
`"suggestion"` and `"comment"` marks. Accept/reject UI is wired against
`"suggestion"`, so diff nodes can never be accidentally "accepted" as
feedback. This namespacing prevents diff overlays from colliding with
reviewer-authored suggestions.

`SymbiotDiffKit` (`packages/symbiot-editor/src/utils/diffKit.ts`) mirrors
`SymbiotEditorKit` for the markdown surface but omits
`SuggestionMarkPlugin` and `CommentPlugin` — the diff viewer doesn't author
annotations, and dropping those plugins removes any chance of leaf-key
collision.

### Render hooks

- **Leaf-level diffs** — inline word changes (e.g. `fox` → `wolf`) render
  via `DiffLeaf` as `<ins>` / `<del>` / `<span>` styled with
  `--anno-insert` / `--anno-delete` / `--anno-replace`.
- **Block-level diffs** — whole-paragraph or block insertions / deletions
  render via the `aboveNodes` hook (`diffElementWrapper`), which wraps the
  block in a tinted `<div>` (or `<span>` for inline elements).
- `aboveNodes` returns `children` for non-diff elements — returning
  `undefined` causes Plate to drop the element entirely. Captured as an
  architectural special in [`architecture.md`](./architecture.md).

### Empty state

When the two versions are byte-identical (the common case if the same plan
markdown was passed to two consecutive viewer boots), `computeDiff` returns
zero ops. `DiffEditor` surfaces this explicitly with a muted info banner
("No textual differences between this version and its predecessor.") so the
reviewer isn't staring at a blank pane wondering whether the renderer
broke. The flag is `data-diff-empty="true"` on the editor root for BDD
selectors.

## Compare current with predecessor

The reviewer can also view the diff between the current (boot) version and
its predecessor without first navigating to a historical row. The History
tab renders a `Compare with previous` button when the active version is
the boot version and a predecessor exists; clicking it flips the editor
pane into the same read-only `DiffEditor` overlay used for historical
selections, and `Back to editing` exits.

- State: `useVersionState.compareWithPredecessor: boolean` plus
  `onToggleCompare()`. The flag is auto-reset when the reviewer switches
  versions so a stale `true` can't bleed across selections.
- Gate: `ReviewScreen` derives
  `inCompareOverlay = isBootVersion && hasPredecessor && compareWithPredecessor`
  and passes it next to `isHistorical` into the `EditorPane`. Both
  paths render `DiffMount`; the historical path is the only one a
  predecessor selection can take, the overlay is the only one the boot
  version with a predecessor can take.
- Sidebar testids: `compare-with-previous` (off) and
  `compare-back-to-editing` (on).

## Drift detection

When a draft authored against version N is re-hydrated against a newer
boot version, the captured anchor text may no longer match the current
plan. The walker now detects this:

- The editor captures `originalText` at annotation creation
  (`applyComment.ts`, `applyDeletion.ts` — both already returned it; the
  values are now persisted) and threads two sidecar maps through the
  draft payload:
  - `commentOriginalTexts: Record<string, string>`
  - `suggestionOriginalTexts: Record<string, string>`
- `walkAnnotations` accepts the same maps. For each fragment, when a
  sidecar entry is present and its stored text differs from the live
  text, the walker calls `resolveAnchor(value, { pathAnchor, originalText })`
  against the current value. If the resolution strategy is `"missing"`,
  the entry's `drifted: true` flag is set; the sidebar projection
  surfaces a destructive `drifted` badge
  (`sidebar-entry-<id>-drift`).
- Back-compat: drafts persisted by older viewer builds lack the sidecar
  maps; the walker emits no drift signal for them and `originalText` is
  reconstructed from the live leaves.
- Drift never affects serialization — only the sidebar UI — because
  `originalText` is still emitted as the second tuple element in the
  C / D tuples. Drifted entries serialize identically; the reviewer just
  knows their snapshot diverged from what's on screen.

## `POST /api/plan/vscode-diff`

Spawns `code --diff <from> <to>` on the host. No in-app caller (the
in-viewer diff is sufficient for human reviewers); the route exists for
third-party agent integrations (VS Code / Obsidian extensions that
target symbiot's HTTP surface).

```
POST /api/plan/vscode-diff
{ "from": 1, "to": 2 }
→ 204 — `code --diff` was spawned
→ 400 — missing/invalid body or unknown version numbers
→ 404 — at least one requested version file does not exist on disk
→ 503 — `code` is not on PATH; body `{ "reason": "code-cli-missing" }`
```

Spawn is detached + `unref` so the viewer process is independent of the
external editor's lifetime — same pattern as `openBrowser.ts`.

## Smoke flow

See [`fixtures/markdown/README.md`](../fixtures/markdown/README.md) for the
end-to-end recipe. tl;dr: three boots, ending on the baseline so the
revision sits one slot back in history, then click the revised row in the
History tab to see all three diff op types simultaneously (insert, delete,
update).

A two-boot flow does not surface a diff: only **historical** versions
render the diff. The current version stays in editable mode so annotation
authoring keeps working.

## Tests

- **Vitest**
  - `packages/symbiot-editor/src/utils/diffPlugin.test.ts` — `computeDiffValue`
    - `pickChangedBlocks` against `fixtures/diff-reference/`.
  - `apps/viewer/src/server/storage.test.ts` — `listVersions` semantics.
- **Playwright-BDD**
  - `features/uc2-version-diff/version-history.feature` — History tab visibility,
    version row selection, current-row marker.
  - `features/uc2-version-diff/version-history-diff.feature` — toggle visibility,
    historical version reveals the diff editor, Clean ↔ Raw flip.
  - `features/uc2-version-diff/predecessor-diff.feature` — `Compare with
previous` button appears on the current version with a predecessor,
    overlay reveals the diff editor, `Back to editing` restores the
    editor.
  - `features/uc1-review-and-approve/drift-detection.feature` — seeded draft with a
    stored anchor missing from the plan triggers the drift badge;
    matching anchor does not.

Version-history scenarios share the `Given a second version of the plan
exists on disk` step from `features/steps/versionHistory.steps.ts`. Drift
scenarios seed a draft directly under `~/.symbiot/drafts/...` in
`features/steps/driftDetection.steps.ts`.

## Cross-references

- Architectural specials: [`./architecture.md`](./architecture.md)
- Smoke fixtures + flow: [`../fixtures/markdown/README.md`](../fixtures/markdown/README.md)
- Server contract overview: [`./server-contract.md`](./server-contract.md)
