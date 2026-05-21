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
feedback. This is the mitigation for R-5 in the PRD.

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

## Smoke flow

See [`fixtures/plans/README.md`](../fixtures/plans/README.md) for the
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
  - `features/plan-review/version-history.feature` — History tab visibility,
    version row selection, current-row marker.
  - `features/plan-review/version-history-diff.feature` — toggle visibility,
    historical version reveals the diff editor, Clean ↔ Raw flip.

Both BDD scenario files share the `Given a second version of the plan
exists on disk` step from `features/steps/versionHistory.steps.ts`.

## Cross-references

- Architectural specials: [`./architecture.md`](./architecture.md)
- Smoke fixtures + flow: [`../fixtures/plans/README.md`](../fixtures/plans/README.md)
- PRD §11 (annotations across versions): [`../PRD.md`](../PRD.md)
- Phase plan + status: [`../plans/04-versioning.md`](../plans/04-versioning.md)
