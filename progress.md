# #236 — Overlay-cancel composer highlight flake: investigation progress

**Status (2026-07-13): GATE MET — 0/20 TWICE.** Run 1: 29207168206 (cf8474a, instrumented). Run 2: 29209432259 (7200025, the final instrumentation-stripped shipped shape). Root cause: BDD draft bleed-through (never an editor/slate-react bug). Final branch shape: pending-highlight decoration (`pendingHighlight.ts` + capture/materialize/cancel), per-scenario draft-wipe `Before` hook, diagnostics stripped, docs updated. Remaining: PR (`Closes #236`), post-merge confirmation probe on `main`, note in #236 that any recurrence = revert + reopen; consider a follow-up issue for hardening the overlay-dismiss step's retry-click loop (no longer harmful, but it was the timing amplifier).

**Status (2026-07-12): ROOT CAUSE CONFIRMED — BDD DRAFT BLEED-THROUGH. Gate run 1 was re-run on cf8474a after the 9ba1e50 drift regression (see below).** First isolation attempt (9ba1e50, DELETE /api/draft inside the open steps, run 29195172230) regressed drift-detection 40/40 — those scenarios SEED a draft in a Given before opening — while the cancel outline had ZERO failures for the first time ever. Reworked (cf8474a): draft wipe moved to a per-scenario `Before` hook (fs-level `rm` of the worker's drafts dir), which runs before any Given, so seeded-draft scenarios survive; in-flight PUTs from a closed scenario are aborted with its browser context, so pre-scenario file deletion is airtight. Local full chromium 98/98. The fingerprint probe (run 29193303335) proved the "unremovable highlight" is a **foreign saved comment hydrated from a leaked draft, present in the model AT COMPOSER OPEN** (`{text:"quick brown fox", keys:["comment","comment_5cb5fd77…"]}` while cancelling `e23a15e0…`). Never an editor/slate-react bug: `Given I open the viewer` reset only the decision file; drafts persist across scenarios per worker; `useDraft` debounces PUTs 1 s, so a write can land after its page closed and the next scenario hydrates it (`ReviewScreen initialValue`). Route-specificity explained: the overlay step is the only dismiss with a retry-click loop (up to 10 s under load) — under the OLD stored-mark flow the eager mark entered the model on open, so a slow overlay dismiss let the dirty debounce fire while the superseding clean write died with the page, poisoning the NEXT repeat. **Fix (9ba1e50): DELETE /api/draft in both viewer-open steps (`fix(bdd): isolate viewer drafts per scenario`); scrub + chunking-off reverted (disproven theories); decoration refactor KEPT** (removes the body-less eager-mark draft leak — the historical poison writer — plus undo preserved, simpler cancel). Local: full chromium 96/96 green. Gate: 0/20 twice; then strip `__diag` instrumentation and probe the stripped head.

1. **Decoration fix implemented** (idea #1, user-authorized): pending highlight is a slate decoration (`pendingHighlight.ts`), marks materialize only on save (parity-tested vs legacy `addMarks`), cancel is a pure store-clear + `redecorate()`. Overlay-dismiss workaround (`b4639be`) reverted. SHA 55692c4.
2. **Probe run 29158059083 on 55692c4 = RED 2/20** (2 failed / 2398 passed) — same signature (`overlay click`, comment kind, `modelClean:true, domCount:1` at `cancel` AND `cancel+tick`). Decoration alone is NOT sufficient — but it proves something huge: `redecorate()` is just a Plate-store `versionDecorate` bump, so a **pure React state update also fails to repaint** the blurred read-only editable. Rate halved (2/20 vs 4-7/20).
3. **NEW ROOT-CAUSE CANDIDATE: Plate 53's default `ChunkingPlugin`** (`chunkSize:1000, contentVisibilityAuto:true`, enabled on every editor — verified `editor.getChunkSize(editor) === 1000`). slate-react 0.124 renders top-level blocks through a **chunk tree cached in `KEY_TO_CHUNK_TREE` weakmaps keyed by the editor's node Keys** — the only mechanism found that explains ALL evidence: bound to the persistent editor instance (survives `<Plate>` remounts = the #237 mystery), intercepts BOTH model-driven and decoration-driven repaints, chromium-only (`content-visibility: auto`), timing/load-sensitive reconcile bookkeeping (`modifiedChunks`/`rerenderChildren`).
4. **Chunking ELIMINATED (run 29165548945 on 49f2905 = RED 3/20**, 3/2397, same signature, all overlay-click comment). `chunking: false` verifiably disables the chunk path (`createPlateEditor({chunking:false}).getChunkSize === null`, confirmed locally), so slate-react's chunk-tree cache is NOT the mechanism. Do NOT re-try. Note rates across shapes (2/20 decoration, 3/20 +chunking-off, 4-7/20 older) are statistically indistinguishable — no attempt has moved the rate convincingly.
5. **Where this leaves the theory:** model clean + decorations clean + chunking off + fresh subtrees red ⇒ on failing repeats a React state update (`versionDecorate` bump) fails to manifest in the editable's DOM for 5+ s on the overlay route only. Escalated; user approved **(a) fiber diag + guarded surgical scrub** (idea #3, safe now that model+decorations are provably clean).
6. **Scrub probe on 774c295 (run 29189651866) = RED 6/20 — but the scrub NEVER ACTED: every failing repeat logged `{"ev":"scrub","scrubbed":false}` (a guard bailed), so the cleanup mechanism itself is untested, not disproven. GOLD from the fiber diag: the surviving mark is `hasFiber:true, connected:true, inEditor:true, slateLeaf:false` — React still manages the element.** A mounted-editor render test proves all three guards pass on a healthy mount, so in the failing repeats the environment lies to a guard — prime suspect: `editor.api.toDOMNode` unavailable (slate's editor→DOM registry torn down mid-flight, which would itself explain the whole flake: effect-level teardown means the subtree can't receive updates). Hardened in 936b4d4 (run 29191458071, in flight): reason-coded `ScrubOutcome` (`pending-active`/`model-marked`/`no-dom`/`scrubbed`/`scrubbed-fallback`) recorded in diag, plus a container fallback (`[data-testid="editor-root"]` scope) so the scrub no longer depends on slate's possibly-broken DOM registry.
7. **PARADIGM SHIFT (run 29191458071 on 936b4d4 = RED 6/20, all overlay): every failing repeat logged `outcome:"model-marked"` — THE MODEL genuinely contains a text leaf with umbrella `comment: true` (without the cancelled id key) at scrub time.** The "unremovable DOM" was never a repaint failure: React was CORRECTLY rendering a mark that the id-scoped `modelClean` check hid from every prior diagnosis. This retro-explains #237's remount mystery (the fresh editor faithfully re-rendered a genuinely-marked model). Leading suspects for the writer: (a) draft bleed-through — `Given I open the viewer` resets ONLY the decision file, drafts persist across scenarios per worker, `useDraft` debounces PUTs 1 s, the scenario before the outline saves a comment and ends without submit, and `ReviewScreen` hydrates `initialValue` from the draft; (b) something writing mid-dismiss. Counter-evidence to (a): failures are overlay-only while hydration would poison button/Escape examples identically; note the overlay step is the only dismiss with a RETRY-CLICK loop (`toPass` 10 s) — the only route that stalls under load. Fingerprint probe in flight (3662515, run 29193303335): diag now records marked-leaf `text`+`keys` at composer OPEN and at cancel — "present at open" = bleed/hydration (test-infra bug); "appears during dismiss" = app-side writer; the keys identify the author (saved uuid vs residue).
8. **Scrub mechanics (current shape):** `scrubOrphanedPendingHighlight` — deferred one tick after cancel; guards: bail if a pending decoration is active OR the model still holds any leaf of the kind; then strips testid/class/colors off remaining `annotation-<kind>` elements (attribute strip, not node removal, so a fiber-attached element stays structurally intact). Diag records `nodes[].hasFiber/connected/slateLeaf/inEditor` per surviving mark at cancel and cancel+tick, plus a `scrub` event with the outcome code. Gate unchanged: 0/20 twice (second run on the instrumentation-stripped head). Fallback if red with `outcome:"scrubbed"` (scrub acted yet DOM still dirty — would mean React re-paints the stale mark back): idea #2 (editor recreate). Upstream slate-react report to be filed regardless once gated.

**Status (2026-07-11, session 1): UNRESOLVED.** Three data-grounded fixes this session eliminated _focus_ and _event-origin_ as causes; the flake persists. Best result so far is the synthetic-`onClick` dismiss at **2/20** (down from 4/20 on `main`), but the gate is **0/20 twice** and none of the attempts reached it. Work is on branch `issue-236-overlay-cancel-defer` (not merged, no PR). `main` is untouched by any of this session's fixes.

Issue: [#236](https://github.com/awinogradov/symbiot/issues/236). Prior: #231 → #232 → #234 → #237. The 2026-06-28 RCA lives in the #236 comment thread.

---

## The bug

BDD Scenario Outline `Cancelling the <kind> composer via <route> discards the applied highlight` (`features/uc1-review-and-approve/comment.feature:60`, also `insertion.feature` / `replacement.feature`) flakes on the **`overlay click`** example only. The Cancel-button and Escape examples never fail.

Symptom: after the reviewer dismisses the modal composer by clicking the Radix backdrop, the eagerly-applied highlight mark (`data-testid="annotation-comment"`) is **not removed from the editor DOM**. The step `the "comment" highlight is absent from the editor` (`features/steps/annotationHighlight.steps.ts:42`) asserts `toHaveCount(0)` but observes `1` for the full 5 s timeout — a true non-removal, not a transient wait.

### How the highlight works (Pattern A)

- The editor is **`readOnly`** (`packages/symbiot-editor/src/components/ReviewEditor.tsx` — `<PlateContent readOnly />`).
- Marks are applied programmatically, bypassing `contenteditable=false`, as **stored text marks** via `editor.tf.addMarks({ [prefix]: true, [prefix_<id>]: true })` (`packages/symbiot-editor/src/utils/applyAnnotation.ts`).
- On cancel they're removed via `editor.tf.unsetNodes(...)` (`packages/symbiot-editor/src/utils/removeAnnotationMark.ts`), invoked from `onComposerCancel` in `useComposerController` (`packages/symbiot-editor/src/components/ReviewEditorAuthoring.tsx`).
- All three dismiss routes call the **same** `onComposerCancel`, which currently rolls back inside `flushSync(() => { setPending(null); dispatchComposerCancel(...); editor.tf.setValue([...editor.children]); })`.

### Reproduction / gate

CI-Linux Heisenbug. Does **not** reproduce on macOS, in isolation (~2,900 isolated runs, 0 failures), or with hot-path `console.log` (observer effect). Reproduces **only** under the faithful CI shape: full 3-browser suite under coverage, repeated, on Linux — `.github/workflows/flake-probe.yml` (`workflow_dispatch`; `repeat_each=20`, empty grep, `workers=3`). The flaky scenario runs on **chromium** (firefox/webkit are `@smoke` only). Gate to declare a fix: **0 failures across `repeat_each`, run twice.** `main` is the positive control (reds ~3–4/20).

### Invariant failure signature (every failing run, all attempts)

```
route      = overlay click (only)
browser    = chromium (only)
modelClean = true      // editor.children has NO mark — the model rollback succeeded
domCount   = 1         // the <mark> DOM node is still present
editorHasFocus = false // editor never holds focus after cancel on ANY route
```

`modelClean:true, domCount:1` is the whole story: **the model is clean, but slate-react leaves the stale `<mark>` DOM node behind.**

---

## What has been tried

`✗` = red on the flake-probe. Rate is failures / 20 repeats.

### Prior art (before this session — from the #236 RCA)

| Ref                        | Mechanism                                                 | Result                                               |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| #189                       | early rollback patch                                      | ✗                                                    |
| #219 (`2558120`)           | test-level retries / quarantine                           | ✗ recurred — **retries are explicitly out of scope** |
| #222 (`1dbb48b`)           | deferred post-commit effect rollback                      | ✗                                                    |
| #232 (`c9f7b74`)           | `contentKey` remount of `<PlateContent>`                  | ✗                                                    |
| #234 (`be485f2`)           | `flushSync(rollback + editor.tf.setValue([...children]))` | ✗ ~3/20 — **this is what's on `main`**               |
| #237 focus-race (reverted) | route-scoped `onCloseAutoFocus` `preventDefault`          | ✗                                                    |
| #237 remount (`3d1c3ac`)   | `flushSync(rollback + plateKey `<Plate>` remount)`        | ✗ 4/20                                               |

**Decisive prior finding (#237, run 28322640952):** an instrumented probe recorded `remounted:true, slateEditors:1, editorRoots:1, markInLiveEditor:true` alongside `modelClean:true, domCount:1`. The `<Plate>` remount _fired_ (editable element swapped) yet a **single, fresh** editable still rendered the stale `<mark>` while the model was clean. Conclusion: staleness is **not** in React's component tree — it survives a subtree remount because `usePlateEditor` creates the `editor` object **once** and reuses it across the remount.

### This session (2026-07-11) — branch `issue-236-overlay-cancel-defer`

| Commit    | Mechanism                                                                                                                                    | Variable neutralized                                                  | Result                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| —         | **revalidated `main`** (`db4d5d9`, unchanged)                                                                                                | —                                                                     | run 29127273911 = **0/20** (luck), run 29129143194 = **4/20 ✗** → still live (4/40 ≈ 10%) |
| `199e3f1` | Hypothesis 1: `onOpenChange` → `queueMicrotask(onCancel)`                                                                                    | event context (microtask, _not_ a React event)                        | run 29131415512 = **5/20 ✗**                                                              |
| `f1464a2` | Focus-redirect: overlay `onMouseDown` `preventDefault` (stop blur-to-`<body>`)                                                               | **focus**                                                             | run 29150161441 = **7/20 ✗**                                                              |
| `b4639be` | Synthetic dismiss: suppress Radix native outside-dismiss (`onPointerDownOutside` `preventDefault`) + dismiss via React `onClick` on backdrop | **event origin** (true React synthetic event, like the Cancel button) | run 29151691093 = **2/20 ✗**                                                              |

**The focus diagnostic that killed the focus theory.** I enriched `recordCancelDiag` to capture `activeTestId` / `editorHasFocus` plus a deferred `cancel+tick` re-snapshot, and ran all 9 cancel scenarios locally (deterministic, since only the _reconciliation failure_ is CI-flaky — the focus landing is not). Result per route at `cancel+tick`:

| Route             | `activeElement` after dismiss    |
| ----------------- | -------------------------------- |
| Cancel button     | `BUTTON` (`composer-cancel`)     |
| Escape            | `TEXTAREA` (`composer-textarea`) |
| **overlay click** | **`BODY`** — focus lost          |

So the working routes keep focus on a **dialog descendant**; the overlay uniquely dropped focus to `<body>` (the mousedown default action, firing _after_ the synchronous rollback). That looked like the differentiator — but the `f1464a2` probe **disproved it**: with focus pinned to the textarea (identical to Escape), the failing CI cases showed `activeTag:TEXTAREA, editorHasFocus:false` and **still** flaked. Focus is not the cause.

Then `b4639be` made the overlay dismiss fire from a React synthetic `onClick` (mirroring the Cancel button in _both_ focus and event origin) — it only got to 2/20. **Event origin is not the (sole) cause either.**

> Note: `b4639be` is still a reasonable change on its own (dismiss via synthetic event, focus stays put) and roughly halved the rate, but it is **not** a fix. The branch also still carries the temporary `symbiot#231` `__diag` instrumentation (`recordCancelDiag` in `ReviewEditorAuthoring.tsx`, the failure dump in `annotationHighlight.steps.ts`), to be stripped once something actually goes green.

---

## Root-cause assessment

The model rollback always succeeds (`modelClean:true`). The failure is purely that **slate-react (platejs) does not reconcile the removed mark's DOM node into the `readOnly`, blurred editable** on the overlay route under CI CPU contention. Ruled out this session:

- **Not event context / origin** — a React synthetic `onClick` dismiss (`b4639be`) still flakes.
- **Not focus** — focus pinned to the textarea like Escape (`f1464a2`) still flakes.
- **Not the React component tree** — a `<Plate>` subtree remount (#237) still renders it, because the `editor` instance is reused.

What's left, and where I'd point the finger: the stale `<mark>` DOM node lives in **slate-react's internal node↔DOM weakmaps (`NODE_TO_ELEMENT` / `ELEMENT_TO_NODE` / key maps) keyed to the persistent `editor` instance**, and slate-react's reconciliation of a **`readOnly` + blurred** editable skips or loses the DOM removal for a **programmatic `unsetNodes`** under load. The three suspicious ingredients, all present together only on this route/config:

1. **`readOnly` editable.** Pattern A mutates a read-only editor via `editor.tf.*`. slate-react's `<Editable>` does much less DOM/selection bookkeeping when `readOnly` (no `beforeinput`, reduced MutationObserver work). A programmatic model change on a read-only editable relies entirely on React re-render → leaf reconciliation, with none of the input-driven paths that would otherwise force a DOM sync.
2. **Stored mark, not decoration.** The highlight is a persisted text-leaf property in `editor.children`. Removing it requires slate-react to re-split leaves and drop the `<mark>` wrapper for that specific text node — a reconcile that appears to be dropped here.
3. **Blur + CI load.** The reconcile that _would_ remove the node is effect/microtask-scheduled; on weak CI cores it races something (Radix close, focus churn) and loses. Cancel/Escape happen to win that race; the overlay pointerdown path doesn't. (But note: making the overlay path synthetic+focus-stable only _reduced_ the rate to 2/20 — it didn't win the race reliably. So the race is real but the timing is not the whole story; the read-only/stored-mark reconciliation gap is.)

My best single-sentence hypothesis: **on a `readOnly` Plate editable, slate-react does not reliably reconcile the DOM when a stored mark is removed programmatically while the editable is blurred — the fix has to stop relying on that reconciliation, not keep re-triggering it.**

---

## Ideas to try next (ranked)

Ordered by my confidence × (inverse) blast-radius. The first two attack the root cause directly; the rest are cheaper probes or escalations.

1. **Render the eager highlight as a DECORATION, not a stored mark** _(highest-value, likely the correct architecture; but touches "Pattern A", which #236 lists out of scope — needs sign-off)._
   Instead of `editor.tf.addMarks` persisting to `editor.children`, compute the pending highlight from React state via `editor.decorate` (return ranges for the pending annotation's span). On cancel, clearing the pending state recomputes decorations with no range. Why it should dodge the bug: decorations are **recomputed every render from a function** and never live in the model, so there's no "remove a stored mark from a read-only editable" reconcile to lose — the leaf simply stops being decorated. Risk: decorations still flow through slate-react leaf rendering, so verify on the probe it doesn't inherit the same reconcile gap; and it changes how `walkAnnotations` sees the _pending_ (pre-save) mark. Only the **eager/pending** highlight needs this; saved annotations can stay stored marks.

2. **Hypothesis 2 — recreate the `editor` instance on cancel** _(RCA rates it "certain to clear it"; invasive)._
   Re-key `usePlateEditor` (`ReviewEditor.tsx:108`) so a fresh instance with empty weakmaps re-deserializes the clean document. Certain because it discards the editor-bound slate state the #237 remount proof implicated. Costs: re-deserialize on every cancel, **loss of undo history**, and it touches the 8 hooks + the `onReady` imperative handle that version-diff / drift-detection / sidebar / task-toggle depend on. The full-suite probe (2400 tests) would catch scenario regressions, but undo-after-cancel is not covered by BDD, so a human should review. Do **not** auto-merge.

3. **Surgical DOM cleanup on the overlay route** _(cheap, contained, but a framework-fighting hack CLAUDE.md discourages)._
   After the `flushSync` rollback, if `domCount > 0`, imperatively unwrap/remove the orphaned `<mark>` node from the DOM. Safe-ish because the model is already clean (`modelClean:true`), so slate has no model node backing that DOM node and shouldn't try to reconcile it; if the text is ever re-rendered it rebuilds from the clean model. Verify slate-react's MutationObserver (largely inert when `readOnly`) doesn't fight it. Two probes to confirm.

4. **Toggle `readOnly` false→true around the rollback** _(untried; targets ingredient #1)._
   Briefly flip the editable out of `readOnly` for the cancel commit so slate-react runs its full editable reconciliation path, then flip back. If the read-only path is what skips the DOM sync, this forces it. Cheap to try; watch for selection/focus side effects.

5. **Force reconciliation via slate-react internals** _(uncertain API surface)._
   Investigate whether platejs exposes a way to invalidate the node→DOM cache or force a leaf re-render for a path (e.g. re-keying just the affected leaf, or a `editor.api`/`ReactEditor` escape hatch). Lower confidence; requires reading the installed platejs/slate-react source.

6. **platejs / slate-react upstream** _(root-cause confirmation, slow)._
   Check the installed platejs version + changelog for read-only reconciliation fixes; build a minimal repro (read-only editable + programmatic `unsetNodes` while blurred, under CPU throttling) and file upstream. Likely a genuine framework limitation.

**What NOT to retry:** anything that re-triggers reconciliation on the _same_ editor instance in the _same_ React tree — deferred effects, `contentKey`, `setValue`, `plateKey` remount, `onCloseAutoFocus`-only, microtask deferral, focus redirection. All proven red. Also do not add retries/quarantine (#219 tried it; out of scope).

---

## Key files

- Rollback logic: `packages/symbiot-editor/src/components/ReviewEditorAuthoring.tsx` (`useComposerController` / `onComposerCancel`, `recordCancelDiag`)
- Mark apply/remove: `packages/symbiot-editor/src/utils/applyAnnotation.ts`, `packages/symbiot-editor/src/utils/removeAnnotationMark.ts`
- Editor host (where `usePlateEditor` lives): `packages/symbiot-editor/src/components/ReviewEditor.tsx`
- Composer + dismiss routes: `packages/symbiot-ui/src/components/AnnotationComposer.tsx`, `packages/symbiot-ui/src/components/ComposerForm.tsx`, `packages/symbiot-ui/src/components/Dialog.tsx`
- BDD: `features/uc1-review-and-approve/comment.feature`, `features/steps/annotationHighlight.steps.ts`, `features/steps/composer.steps.ts`
- Probe: `.github/workflows/flake-probe.yml`

## How to continue

1. Pick an idea above (my recommendation: prototype **#1 decoration**, fall back to **#2 editor-recreate** if Pattern-A change is rejected).
2. Implement on `issue-236-overlay-cancel-defer` (keeps the `__diag` instrumentation for diagnosis).
3. Dispatch `flake-probe.yml` against the branch: `gh workflow run flake-probe.yml --ref issue-236-overlay-cancel-defer -f repeat_each=20 -f grep="" -f workers=3`. `main` reds ~4/20 as the positive control.
4. Gate = **0/20, twice**. Only then strip the `symbiot#231` instrumentation, update the `[symbiot#231]` step string to `#236`, open the PR (`Closes #236`), and merge.
