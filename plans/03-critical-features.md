# Phase 3 — Critical features (3 plan-review annotation types)

## Goal

Land the core plan-review feature set: the **three annotation types** that share a wire format with plannotator (Comment, Global Comment, Deletion), both editor modes (Review + Redline), the sidebar, image attachments, annotate mode for arbitrary markdown files, and drafts.

After this phase, M2 holds — feedback markdown is byte-compatible with the plannotator wire format for these three types, so existing agent integrations can drive symbiot transparently.

## Exit criteria

- [ ] All three annotation types apply, persist in the Plate value, and serialize to feedback markdown that is **byte-compatible** with the plannotator wire format (M2 — golden-file tests per type against captured reference fixtures).
- [ ] **Review mode** (default): floating toolbar offers **Comment** + **Delete** on selection; **Global Comment** is available without selection from the top bar.
- [ ] **Redline mode**: selection auto-applies a deletion; an "Undo last redline" affordance is present. Mode toggle in top bar persists across sessions (`localStorage`).
- [ ] Sidebar:
  - Collapsible right-aligned shadcn `Sidebar`.
  - Sections: Annotations (filterable by type) and Global Comments.
  - Annotation counts via `Badge`.
  - Click annotation → scroll to and focus its anchor in the document.
  - "Clear all" with `AlertDialog` confirmation.
- [ ] Image attachments work end-to-end on any annotation: upload via `/api/upload` with the security model below (extension whitelist, UUID temp names, path-traversal protection); references render in sidebar entries and feedback markdown.
- [ ] Annotate mode: `symbiot annotate <file.md>` works against `/api/feedback`.
- [ ] Drafts persist via `/api/draft` (save/restore work across page reloads).
- [ ] Dual-anchor strategy implemented: anchors stored as Plate paths/offsets + `originalText` snapshot.

## Scope

### `packages/symbiot-server`

Complete the plan + annotate endpoint set per PRD §15 retained list:

- `GET  /api/plan` (with mode flag: plan | annotate)
- `POST /api/approve`, `POST /api/deny`
- `POST /api/feedback` (annotate mode)
- `POST /api/upload`, `GET /api/image`
- `GET/POST/DELETE /api/draft`

Bun runtime, filesystem-only storage. Security model: localhost-only binding, CORS restricted to the local viewer origin, extension whitelist on uploads, UUID temp filenames, path-traversal protection on every file write.

### `packages/symbiot-editor`

- Add `SuggestionKit` for delete suggestions.
- Add `MediaImageKit` for inline image references.
- Build `RedlineEditor` wrapper (`readOnly` default, selection auto-applies a deletion via Pattern A).

### `packages/symbiot-annotations`

- Full codec for the 3 plannotator-compatible tuple types:
  - `['C', originalText, text, author?, images?]`
  - `['G', text, author?, images?]`
  - `['D', originalText, author?, images?]`
- **Dual-anchor strategy** (foundational; expanded in Phase 4): store Plate path + `originalText`. On load, resolve by path first, fall back to text-quote on `originalText` if path is invalid.
- Golden-file test corpus expanded to cover all three types in every supported markdown element context.

### `packages/symbiot-ui`

Vendor and wire these shadcn components:

- `Sidebar` (right-aligned, collapsible)
- `ToggleGroup` (Review / Redline)
- `DropdownMenu` (top bar: Approve / Request changes / Share — Share disabled until Phase 6)
- `Tabs`
- `Badge`
- `AlertDialog`
- `Popover` composer for Comment (text + image attach)
- Global Comment composer (similar Popover triggered from top bar)

### `apps/hook`

Support annotate mode invocation; pass mode through the URL hash.

## Out of scope (deferred)

- **Insertion + Replacement** → Phase 5 (net-new symbiot extensions beyond the plannotator-compatible tuple set).
- **Plan version diff** → Phase 4.
- **Sharing / portal** → Phase 6.
- **Theming polish, AA contrast verification** → Phase 7.
- **Bundle/a11y/CI** → Phase 8.

## Tasks

1. Extend `packages/symbiot-server`: add `/api/feedback`, `/api/upload`, `/api/image`, `/api/draft`. Implement upload security as specified above (whitelist, UUID, traversal guard).
2. Add `SuggestionKit` to the editor kit. Implement deletion authoring (selection → strikethrough render via suggestion mark).
3. Build `RedlineEditor`: same kit + a `useEffect` hook on selection that auto-applies a deletion.
4. Mode toggle in top bar; persist to `localStorage` key `symbiot.editor-mode`.
5. Implement the Sidebar (sections, filters, counts, click-to-focus, Clear all).
6. Build Global Comment composer in the top bar.
7. Wire image upload + attach to all three annotation composers.
8. Implement `apps/hook` annotate mode (CLI flag → mode hash → server starts in annotate mode → editor uses annotate UI).
9. Implement Draft auto-save (debounced POST to `/api/draft`) and restore (GET on load).
10. Extend the annotation codec to cover all three types + dual anchors.
11. Golden-file corpus: capture a reference plannotator emission for fixture plans × every annotation type × every markdown element context. Diff symbiot output against it in CI (CI lands in Phase 8 — for now run locally).

## Dependencies

In addition to Phase 2's:

- `@platejs/suggestion`
- `@platejs/media` (image plugin only)
- Additional shadcn primitives: `sidebar`, `toggle-group`, `dropdown-menu`, `tabs`, `badge`, `alert-dialog`

## Risks / OQs

- **R-3 (markdown round-trip lossiness)** for exotic content. Define supported subset per FR-1.2; pass unknown blocks through verbatim; build round-trip tests early.
- **R-4 (`globalComments` split-brain).** Keep them an explicit app-level collection on `SymbiotDocument.globalComments[]`, never a Plate mark. Single serializer in `symbiot-annotations` owns both worlds.

## Verification

- **Unit (Vitest):** markdown round-trip across the FR-1.2 element set; annotation serialize/deserialize per type; image upload security tests (path traversal rejected, non-whitelisted extension rejected, UUID temp name applied).
- **Manual:** run every annotation flow, both modes (Review + Redline), with images on each annotation; compare output to the captured plannotator reference fixtures.
- **Golden files:** byte-compatible feedback markdown vs the plannotator reference for each of the three types. **This is the M2 gate.**
- **Cross-phase gate (after this phase):** Phase 2's MVP loop still works; the additional annotation types layer on cleanly.
