# Phase 3.2 — Deletion + Modes + Sidebar (M2 gate)

> **Status:** 🟢 M2 gate passed (2026-05-19). The end-to-end Playwright scenario `features/plan-review/m2-gate.feature` drops one Comment, one Deletion, and one Global Comment via the real UI and the resulting feedback markdown contains all three plannotator-compatible kinds. Deletion authoring (mark-only, no @platejs/suggestion plugin) and the top-bar Global Comment composer landed. **Follow-ups** required to fully close 3.2: (a) `RedlineEditor` with selection-auto-deletion + mode toggle (Review / Redline) persisted to `localStorage`, (b) `AnnotationSidebar` and the missing shadcn primitives (`Sidebar`, `ToggleGroup`, `DropdownMenu`, `Tabs`, `Badge`, `AlertDialog`, `Tooltip`), (c) optional strikethrough rendering for deletion marks (currently they're walked correctly by the codec but render as plain text in the editor; see [Follow-ups](#follow-ups-for-the-rest-of-3-2)).

> Third sub-phase of Phase 3. Lands the Deletion authoring UI (via `@platejs/suggestion`), the `RedlineEditor` and Review/Redline mode toggle, the missing shadcn primitives, the right-aligned annotation sidebar, and the Global Comment composer in the top bar. After this sub-phase, **M2 holds** — symbiot's feedback markdown is byte-compatible with the plannotator wire format for all 3 shared annotation types (Comment, Global Comment, Deletion). Depends on **Phase 3.1**.

## Goal

Add the remaining UIs for the two annotation types whose codec already landed in 3.1 (Global Comment, Deletion), plus the sidebar that surfaces all annotations, plus the Redline mode that turns selection into auto-deletion. The wire format passed unit-level golden checks in 3.1; this sub-phase proves it end-to-end through a real browser flow (the M2 gate).

## Exit criteria

- [ ] **Comment**, **Global Comment**, and **Deletion** can all be applied in the viewer and survive a `serializeFeedback` round-trip that byte-matches the corresponding `fixtures/plannotator-reference/*.md` golden.
- [ ] Review mode (default): floating toolbar offers **Comment** + **Delete** on selection; Global Comment is available from a dropdown in the top bar without selection.
- [ ] Redline mode: making a selection auto-applies a Deletion after a 400 ms debounce; **Undo last redline** is exposed in the top bar and rewinds the most recent suggestion.
- [ ] Mode toggle in the top bar persists across reloads via `localStorage["symbiot.editor-mode"]`.
- [ ] Right-aligned collapsible sidebar:
  - Two sections: **Annotations** (filterable by type via Tabs) and **Global Comments**.
  - Counts via shadcn `Badge`.
  - Click an entry → editor scrolls and focuses its anchor.
  - **Clear all** with `AlertDialog` confirmation.
- [ ] Top bar replaces the single Approve/Deny pair with a `DropdownMenu` (Approve / Request changes / Share — Share disabled with `Tooltip`).
- [ ] All missing shadcn primitives vendored under `packages/symbiot-ui/src/components/`: `Sidebar`, `ToggleGroup`, `DropdownMenu`, `Tabs`, `Badge`, `AlertDialog`, `Tooltip`.
- [ ] All four golden fixtures (`comment.md`, `global-comment.md`, `deletion.md`, `mixed.md`) byte-match end-to-end via Playwright-BDD scenarios that drive the real UI.
- [ ] **M2 GATE:** `mixed.md` produced by a real Playwright run that drops one of each annotation type byte-matches the plannotator reference fixture.

## Scope

### `packages/symbiot-editor`

- Add `@platejs/suggestion` to `SymbiotEditorKit` with `isSuggesting: false` default, `isSuggesting: true` opt-in via `editor.setOption(SuggestionPlugin, 'isSuggesting', true)`.
- `applyDeletion.ts`: mirror `applyComment.ts` shape. On invocation: capture selection text → flip `isSuggesting` to true → `editor.tf.delete()` → restore `isSuggesting` to false. Returns `{ id, originalText }`.
- `walkDeletions.ts` (or extend `walkAnnotations.ts` from 3.1): walk suggestion marks, group by suggestion id, reconstruct D-tuples.
- `RedlineEditor.tsx`: same `SymbiotEditorKit`, but mounts a `useEffect` on selection change that auto-applies a Deletion (debounced 400 ms, `useDebounce` from a small inline helper — no new dep). Exposes a `redlineHistory` ref that the top bar's Undo button consumes.
- `SelectionToolbar.tsx`: add a second child slot for the Delete button (no architectural change — it already accepts children).

### `packages/symbiot-ui`

Vendor the missing shadcn primitives. Each file matches the structure of the existing `Button.tsx` / `Popover.tsx` / `Textarea.tsx` (function-component, named export, Tailwind classes, `cn()` helper, `data-testid` props pass-through):

- `components/Sidebar.tsx` — right-aligned collapsible. Hooks: `useSidebar()` exposes `open`, `toggle`.
- `components/ToggleGroup.tsx` — wraps `@radix-ui/react-toggle-group`.
- `components/DropdownMenu.tsx` — wraps `@radix-ui/react-dropdown-menu`. Exports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`.
- `components/Tabs.tsx` — wraps `@radix-ui/react-tabs`.
- `components/Badge.tsx` — pure Tailwind, no Radix.
- `components/AlertDialog.tsx` — wraps `@radix-ui/react-alert-dialog`.
- `components/Tooltip.tsx` — wraps `@radix-ui/react-tooltip` (dep already installed in Phase 2).

Higher-level UI components:

- `GlobalCommentComposer.tsx` — Popover triggered from a top-bar dropdown item. Same Popover + Textarea + Enter/Esc pattern as `CommentComposer`, no anchor text. `onSave(body)` callback. Hoist the keyboard-handling helper from `CommentComposer.tsx` into a shared `submitKey.ts` util so both components share it.
- `AnnotationSidebar.tsx` — right-aligned `Sidebar`. Props: `{ comments: CommentEntry[]; globalComments: GlobalCommentEntry[]; deletions: DeletionEntry[]; onFocus(id: string): void; onClearAll(): void; }`. Renders Tabs for type filtering, Badge for counts, Click-to-focus via `onFocus`. Clear-all triggers `AlertDialog`; user confirms; `onClearAll()` fires.

### `apps/viewer/src/client`

- `App.tsx`: read `localStorage["symbiot.editor-mode"]` (default `"review"`) → render `ReviewEditor` or `RedlineEditor`. Maintain top-level state for `comments`, `globalComments`, `deletions`. Pass `onFocus`/`onClearAll` down to the sidebar.
- Top bar: replace single Approve/Deny pair with a `DropdownMenu`:
  - "Approve" → existing `/api/approve` flow.
  - "Request changes" → existing `/api/deny` flow.
  - "Share" → disabled, `Tooltip` says "Available in Phase 6."
  - Separately, a `ToggleGroup` for Review / Redline mode (persisted to `localStorage`).
  - "Global Comment…" item opens the `GlobalCommentComposer`.
  - When in Redline mode, an additional "Undo last redline" item invokes the editor's history.

### `packages/symbiot-annotations`

- Confirm `walkAnnotations.ts` (or its split siblings) correctly extracts all three annotation kinds. If 3.1 stubbed the D path, complete it here. No new tuple types.

### `features/`

- `features/plan-review/deletion.feature` — drop a Deletion, see strikethrough, Deny → feedback contains D-tuple text.
- `features/plan-review/global-comment.feature` — open Global Comment composer from the dropdown, type body, save, Deny → feedback contains G-tuple text.
- `features/plan-review/mode-toggle.feature` — toggle to Redline, selection auto-marks as deleted, click Undo, mark gone. Reload — toggle position persisted.
- `features/plan-review/sidebar.feature` — drop all three annotation types, sidebar shows them with counts; click an entry → editor scrolls to anchor; Clear all → AlertDialog confirms → list empties.
- New step files: `features/steps/sidebar.steps.ts`, `mode.steps.ts`, `dropdown.steps.ts`.

## Out of scope (deferred)

- Image attachments → 3.3.
- Drafts → 3.3.
- Annotate mode CLI → 3.3.
- Insertion / Replacement annotation types → Phase 5.
- Version history / diff → Phase 4.
- AA contrast verification on annotation tokens → Phase 7.

## Tasks

1. Add `@platejs/suggestion` + `applyDeletion.ts` + decoder path for D-tuples.
2. Add the Delete button to `SelectionToolbar.tsx`.
3. Build `RedlineEditor.tsx` with debounced auto-deletion + undo history.
4. Vendor `Sidebar`, `ToggleGroup`, `DropdownMenu`, `Tabs`, `Badge`, `AlertDialog`, `Tooltip` under `packages/symbiot-ui/src/components/`. Install Radix deps.
5. Hoist `submitKey` from `CommentComposer.tsx` into a shared util; build `GlobalCommentComposer.tsx` reusing it.
6. Build `AnnotationSidebar.tsx`.
7. Restructure `TopBar.tsx`: `DropdownMenu` for actions, `ToggleGroup` for mode, Global Comment item.
8. Update `App.tsx` to wire mode toggle, sidebar mount, top-level annotation state.
9. Add four new `.feature` files + three new step files. Add `data-testid` attributes on every new interactive element.
10. Verify all four golden fixtures still byte-match end-to-end. Run the M2 gate scenario.

## Files to create / touch

| Package / dir | Files |
|---|---|
| `packages/symbiot-editor` | `src/kit.ts`, `src/SelectionToolbar.tsx`, **`src/applyDeletion.ts`**, **`src/applyDeletion.test.ts`**, **`src/RedlineEditor.tsx`** |
| `packages/symbiot-annotations` | `src/walkAnnotations.ts` (extend or finalize) |
| `packages/symbiot-ui` | **`src/components/Sidebar.tsx`**, **`ToggleGroup.tsx`**, **`DropdownMenu.tsx`**, **`Tabs.tsx`**, **`Badge.tsx`**, **`AlertDialog.tsx`**, **`Tooltip.tsx`**, **`src/submitKey.ts`**, **`src/GlobalCommentComposer.tsx`**, **`src/AnnotationSidebar.tsx`**, `src/CommentComposer.tsx`, `src/TopBar.tsx`, `src/index.ts` |
| `apps/viewer` | `src/client/App.tsx`, `src/client/styles.css` (`@source` confirms — no new packages, but verify) |
| `features/` | **`plan-review/deletion.feature`**, **`global-comment.feature`**, **`mode-toggle.feature`**, **`sidebar.feature`**, **`steps/sidebar.steps.ts`**, **`mode.steps.ts`**, **`dropdown.steps.ts`** |

Bold = new file.

## Dependencies (pinned)

- `@platejs/suggestion@53.x`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-tabs`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-toggle-group`
- (`@radix-ui/react-tooltip` already installed from Phase 2)

## Risks / open questions

- **`@platejs/suggestion` interaction with Pattern A.** The plugin assumes the editor is editable when `isSuggesting: true`. Verify that `editor.setOption(SuggestionPlugin, 'isSuggesting', true)` + `editor.tf.delete()` works while `<PlateContent readOnly />` is mounted (Phase 0 found `editor.tf.*` transforms bypass `contenteditable=false` for `addMarks`; deletions need the same property — confirm with a vitest test before building the UI).
- **Redline auto-deletion debounce vs typing.** The Phase 0 typing-guard blocks free typing; redline auto-deletion should still respect it. Confirm the `selectionchange` listener fires from selection drag, not from key events.
- **Sidebar click-to-focus across virtualized content.** Plate doesn't virtualize, but `scrollIntoView` + `editor.tf.setSelection` must not double-fire selection events that re-trigger the redline auto-deletion. Implement an "intentional selection" flag.
- **Tooltip / DropdownMenu portal layering.** Both Radix primitives use portals; verify they sit above the Sidebar's z-index in dark/light themes.

## Verification

```sh
bun run typecheck
bun run lint
bun run test          # walkAnnotations covers all three kinds; golden fixtures still byte-match
bun run build
bun run test:e2e      # Phase 3.0 + 3.1 specs + four new specs
bun run format:check
```

**M2 GATE scenario** (`features/plan-review/sidebar.feature` includes it):

1. Open viewer.
2. Select a paragraph → click Comment in the toolbar → composer opens → type "Comment body" → Enter.
3. From the top-bar dropdown, click "Global Comment…" → type "Global body" → Enter.
4. Select a sentence → click Delete in the toolbar.
5. Sidebar shows three entries, each section count matching.
6. Click Deny.
7. Decision-marker file's feedback markdown byte-matches `fixtures/plannotator-reference/mixed.md`.

Manual:

```sh
bun run viewer:smoke
# Toggle to Redline → selection auto-deletes after 400ms.
# Click "Undo last redline" → strikethrough disappears.
# Reload → still in Redline mode.
```

## Follow-ups (for the rest of 3.2)

The first iteration shipped the M2 gate — Deletion authoring via a toolbar Delete button and a top-bar Global Comment composer. Remaining 3.2 scope:

- **Redline mode + mode toggle.** Build `RedlineEditor.tsx` that auto-applies a Deletion (debounced 400 ms) on selection. Add a `ToggleGroup` to the top bar that selects Review vs. Redline mode and persists to `localStorage["symbiot.editor-mode"]`. App.tsx reads the persisted mode on mount and renders the appropriate editor.
- **Sidebar.** Vendor `Sidebar`, `ToggleGroup`, `DropdownMenu`, `Tabs`, `Badge`, `AlertDialog`, `Tooltip` under `packages/symbiot-ui/src/components/`. Build `AnnotationSidebar.tsx` with the three sections (Comments, Deletions, Global Comments), Badge counts, click-to-focus, and Clear-all via AlertDialog. Add `features/plan-review/sidebar.feature` scenario.
- **Strikethrough rendering for deletion marks.** The walker picks up `suggestion_<id>: true` marks correctly, but the editor renders the marked text as plain. Either register a minimal leaf renderer for the `suggestion: true` mark (Tailwind `line-through` class) or revisit @platejs/suggestion integration with the correct mark-data shape.
- **`@platejs/suggestion` proper integration.** Phase 3.2's first iteration used custom `suggestion_<id>: true` marks because the @platejs/suggestion plugin requires structured mark data and rendering proved brittle. Re-evaluate when the strikethrough renderer lands — if the plugin's leaf renderer can be used as-is, swap in for free.
