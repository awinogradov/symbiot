# Phase 5 — Extended annotations (Insertion + Replacement)

## Goal

Complete the **5-type annotation set** claimed by the PRD. Insertion and Replacement are **net-new symbiot annotations** that go beyond the plannotator-compatible 3-tuple set delivered in Phase 3. PlateJS `SuggestionKit` makes them cheap to add once the deletion path is in place.

## Exit criteria

- [ ] **Insertion** (`SuggestionKit` insert suggestion):
  - Reviewer selects a short context span as an anchor.
  - Reviewer supplies new text to insert after it.
  - Suggestion renders with insertion-colored highlight (`--anno-insert`), visually distinct from deletions (PRD §6.5).
- [ ] **Replacement** (`SuggestionKit` delete+insert pair tracked as one unit):
  - Reviewer selects text and supplies replacement.
  - Original text and proposed text are both visible and visually paired (PRD §6.6).
- [ ] Selection toolbar in Review mode offers all four actions: **Comment**, **Delete**, **Insert**, **Replace** (PRD §6.8).
- [ ] Both types support image attachments, `author`, `createdAt`.
- [ ] Codec extended with:
  - `['I', contextText, newText, author?, images?]`
  - `['R', originalText, replacementText, author?, images?]`
- [ ] Feedback markdown export:
  - Insertion → `"Insert after <context>: …"` form (PRD Appendix A).
  - Replacement → `"Replace with: …"` form.
- [ ] Sidebar entries render correctly for both types; type-filterable groups updated.
- [ ] Golden-file tests cover both types end-to-end.
- [ ] **PRD updated to v1.2** with a changelog note that Insertion + Replacement are net-new symbiot extensions beyond the plannotator-compatible tuple set.

## Scope

### `packages/symbiot-editor`

- Enable insert + replace suggestion authoring on top of the deletion plumbing from Phase 3 (same Pattern A unlock-and-relock around the transaction).
- Implement inline composer popovers for the text-input affordances. Same UX pattern as the Comment composer: Enter to save, Escape to cancel, image attach available.

### `packages/symbiot-annotations`

- Extend codec with the two new tuples.
- Update the feedback-markdown serializer to emit the spec format strings for I and R.
- Extend the dual-anchor resolution (from Phase 4) to the new types: Insertion anchors on `contextText`; Replacement on `originalText`.

### `packages/symbiot-ui`

- Add **Insert** and **Replace** icon buttons to the floating toolbar (Review mode).
- Build inline `Popover` composers for both, identical UX to Comment (Enter / Escape / image attach).

## Out of scope

- **Sharing** of these annotation types (along with the existing three) — Phase 6.
- **Theming polish** of the new color tokens `--anno-insert`, `--anno-replace` (AA contrast verification) — Phase 7.

## Tasks

1. Extend `symbiot-editor`: add insert + replace authoring helpers (`applyInsertion`, `applyReplacement`) wrapping the Pattern A unlock-and-relock.
2. Extend `symbiot-annotations`: codec tuples + serializer + dual-anchor extension.
3. Extend `symbiot-ui`: toolbar icons + composer popovers.
4. Sidebar: ensure new types render with correct icons, badges, and filter groups.
5. Golden-file tests against the spec output format for I and R.
6. Update PRD to v1.2; add changelog entry noting I + R are net-new symbiot extensions beyond the plannotator-compatible set.

## Dependencies

No new packages — all builds on `@platejs/suggestion` (already added in Phase 3) and the existing shadcn primitives.

## Risks / OQs

- None new. The Pattern A pattern was de-risked in Phase 0 and applied successfully in Phase 3.

## Verification

- **Unit (Vitest):** codec round-trip per type; feedback markdown emission matches the spec format byte-for-byte (snapshot tests).
- **Manual:** drop an Insertion and a Replacement; request changes; verify feedback markdown matches the format `"Insert after <context>: …"` and `"Replace with: …"`.
- **Cross-phase gate (after this phase):** **5-type annotation set complete**; M1 holds. M2 still holds for the three plannotator-compatible types.
