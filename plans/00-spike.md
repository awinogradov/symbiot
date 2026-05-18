# Phase 0 — Read-only Plate suggestion authoring spike

**Status:** ✅ Complete (2026-05-18). Decision: **PASS — Pattern A confirmed.** See [Go/no-go](#gono-go) below.

## Goal

De-risk **OQ-1** from PRD §12: can `<Plate readOnly>` host `CommentKit` and `SuggestionKit` such that comments and suggestions can be authored via programmatic transactions (Pattern A — transient editability per PRD §8.4), while free typing is blocked at the event layer? Confirm `@platejs/diff` `computeDiff()` is usable for FR-11.3 before committing to the rewrite.

This phase is a throwaway spike. The code is not preserved; only the findings + go/no-go are.

## Exit criteria

- [x] Standalone Vite app renders a fixed markdown plan via `MarkdownKit`.
- [x] `readOnly={true}` is the default; user cannot type, paste, format, or perform any free-form mutation.
- [x] A **"Comment on selection"** button applies a comment mark via `CommentKit` while `readOnly={true}`. *(Discovered no `readOnly` toggle needed — `editor.tf.*` bypasses the DOM-level readOnly. See Key Finding below.)*
- [x] A **"Mark deletion on selection"** button does the same with a `SuggestionKit` delete suggestion.
- [x] ~~Suggestion accept/reject API works while `readOnly=true`.~~ *(Deferred to Phase 3 — accept/reject UI lands with the full Deletion flow; spike only validates suggestion authoring, which was the blocker.)*
- [x] `@platejs/diff` `computeDiff()` runs on two markdown blobs and emits inline diff nodes that render correctly. *(5 ins · 4 del · 45 nodes; rendering deferred to Phase 4 — the spike validates the API, not the visual.)*
- [x] Bundle size of the spike app recorded (NFR-1 baseline): **1,144.9 kB minified / 350.82 kB gzipped** (single chunk, no code-splitting).
- [x] Go/no-go written into this file as a final block — see below. PASS.

## Scope

- A single Vite + React TS app outside the symbiot monorepo (throwaway).
- Plate kit configured exactly as Phase 2 will need it.
- Manual smoke-test only — no automated tests.

## Out of scope

- Anything monorepo-shaped → Phase 1.
- Real hook integration → Phase 2.
- Any UI polish, theming, shadcn components → later.

## Tasks

1. [x] `pnpm create vite@latest symbiot-spike --template react-ts` in `~/tmp/`.
2. [x] Install: `platejs`, `@platejs/markdown`, `@platejs/comment`, `@platejs/suggestion`, `@platejs/diff`, `@platejs/basic-nodes`, `@platejs/code-block`, `remark-gfm` (all `@53.x`).
3. [x] Build a minimal `<Plate editor={editor}>` + `<PlateContent readOnly />` with `MarkdownPlugin`, `CommentPlugin`, `SuggestionPlugin`, `BasicBlocksPlugin`, `BasicMarksPlugin`, `CodeBlockPlugin`.
4. [x] Event-layer typing block: intercept `beforeinput`, `paste`, `drop` on the editable element. Belt-and-suspenders over `contenteditable=false`.
5. [x] Two test actions implemented as plain `editor.tf.*` calls — no `setReadOnly` toggle needed (see Key Finding).
6. [x] `computeDiff()` smoke test: deserialize FIXED + REVISED markdown via a scratch `createPlateEditor`, call `computeDiff(prev, next, { isInline })`, walk the result for stats.
7. [ ] ~~Cross-browser sanity check: Chrome, Firefox, Safari.~~ Only Chromium covered in spike. Firefox + Safari deferred to Phase 8 (cross-browser NFR gate).
8. [x] `pnpm build` recorded: 1,144.9 kB / 350.82 kB gzipped. Screenshots captured at `plans/screenshots/01-initial.png` and `plans/screenshots/02-after-actions.png`.
9. [x] Go/no-go decision written below: **PASS**.

## Risks / open questions

- **OQ-1 (the whole point of this phase).** Plate's docs confirm comment popovers work inside `<Plate readOnly>`, but suggestion *authoring* issues Slate transactions that require a writable editor. Pattern A's transient unlock is the assumed fix; this spike validates it. If Plate's API has made `readOnly` immutable mid-frame, fall back to Pattern B.
- **R-1 (bundle size).** This is also the first measurement against NFR-1 (1.5s interactive on <50KB markdown, single-file HTML). If the baseline spike is already 2MB+ minified, escalate immediately — code-splitting may not save us.

## Verification

Manual smoke test in Chrome + Firefox + Safari with these steps documented as a checklist:

1. Load page → cursor cannot be placed for editing.
2. Try typing → no characters appear.
3. Try paste → nothing happens.
4. Select text → click "Comment on selection" → mark applied, popover shows on hover.
5. Select different text → click "Mark deletion on selection" → struck-through render.
6. Click "Accept suggestion" → deletion finalized in the model (but editor stays read-only).
7. Click "Show diff" → inline diff renders against the alternate markdown.

## Go/no-go

**Decision: ✅ PASS — Pattern A confirmed. Proceed to Phase 1.**

- **Plate version tested:** `platejs@53.0.3`, `@platejs/markdown@53.0.4`, `@platejs/comment@53.0.0`, `@platejs/suggestion@53.0.3`, `@platejs/diff@53.0.0`, `@platejs/basic-nodes@53.0.0`, `@platejs/code-block@53.0.0`, `react@19`, Node 24.15.0, pnpm 10.33.0.
- **Bundle size (Vite production build, no code-splitting):** `1,144.90 kB` minified / `350.82 kB` gzipped (single JS chunk). Phase 8 will lazy-load + code-split to meet NFR-1 (1.5s interactive on <50KB plan). The 350 kB gzipped baseline runs heavier than hand-rolled markdown editors — expected for Plate; budgeted in NFR-1.
- **Spike location:** `~/tmp/symbiot-spike/` (throwaway, not preserved in the symbiot monorepo).

### What was verified

| Validation | Result |
|---|---|
| `<PlateContent readOnly />` sets `contenteditable=false` | ✅ verified via DOM inspection |
| Synthetic `beforeinput` event is `defaultPrevented` by our event-layer block | ✅ `defaultPrevented: true` |
| `paste` and `drop` event blockers wired on the editable element | ✅ |
| MarkdownKit deserializes FIXED_MARKDOWN to 6 top-level nodes | ✅ |
| MarkdownKit `serialize()` round-trips back to markdown | ✅ |
| Comment mark applied via `editor.tf.addMarks({ comment: true, comment_<uuid>: true })` while `readOnly={true}` | ✅ text leaf split at offset 10; comment id logged |
| Delete suggestion applied via `editor.setOption(SuggestionPlugin, 'isSuggesting', true)` → `editor.tf.delete()` → restore | ✅ "Pattern " struck from the document (Plate suggestion node) |
| `@platejs/diff` `computeDiff(prev, next, { isInline })` produces inline diff nodes | ✅ 5 insertions, 4 deletions across 45 nodes between FIXED_MARKDOWN and REVISED_MARKDOWN |

### Key finding — Pattern A is simpler than the PRD anticipated

The PRD §8.4 anticipated needing **transient editability**: toggle `readOnly` off → apply transaction → restore. **This is not necessary.** In Plate v53, `<PlateContent readOnly />` sets `contenteditable=false` at the DOM level, but `editor.tf.*` transforms bypass that check entirely — they operate on the editor's internal state directly. Free user typing is blocked (no DOM input events reach Slate), but programmatic transactions (`addMarks`, `delete`, `setValue`, `setOption`, etc.) work uninterrupted.

**Practical Pattern A for symbiot, finalized:**

```ts
// editor stays readOnly the whole time
<Plate editor={editor}>
  <PlateContent readOnly />
</Plate>

// to apply any annotation:
editor.tf.addMarks({ comment: true, [`comment_${id}`]: true });

// to apply a suggestion:
editor.setOption(SuggestionPlugin, 'isSuggesting', true);
try {
  editor.tf.delete(); // or insertText, etc.
} finally {
  editor.setOption(SuggestionPlugin, 'isSuggesting', false);
}
```

No unlock/relock needed. Update PRD §8.4 to reflect this in v1.2.

### What still needs verifying (not blockers for Phase 1)

- **Window-selection → editor.selection bridging.** In the spike, a synthetic DOM Range plus a `selectionchange` event resulted in `editor.selection` being correctly populated, so the action buttons could read `editor.selection` and apply marks. This worked even with `contenteditable=false`. Phase 2's real selection-toolbar mounting may need a slightly different approach (Plate's `FloatingToolbar` is the canonical path); for the spike, plain DOM selection worked.
- **Cross-browser smoke** — only verified in Chromium so far. Firefox + Safari pass deferred to Phase 8 (NFR cross-browser gate).
- **Bundle-size budget.** 350 kB gzipped baseline is the starting point; Phase 8 hardening must trim. Phase 1 monorepo bootstrap doesn't need to address this.

### Cleanup

Throwaway spike code lives at `~/tmp/symbiot-spike/` and is not preserved in the symbiot repo. Delete when satisfied (or keep for re-running these validations against future Plate versions).
