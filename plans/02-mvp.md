# Phase 2 — Claude Code hook MVP

**Status:** ✅ Complete (2026-05-19). End-to-end loop works against a real Claude Code session in plan mode; M2 golden file holds. See [Completion notes](#completion-notes) below for the divergences from the as-planned spec and the carry-forward gaps for Phase 3.

> Smallest possible vertical slice: render + Approve/Deny + one anchored Comment.

> **Architectural decision (locked at the top of this phase):** the `packages/symbiot-server` placeholder from Phase 1 is deleted; server logic lives in `apps/viewer/src/server/` alongside the React/Vite client in `apps/viewer/src/client/`. `apps/viewer` is the consolidated fullstack binary that every Phase 9 agent integration will spawn. `apps/hook` imports `startServer` from `@symbiot/viewer`.

## Goal

Prove the full plan-review loop end-to-end: Claude Code finishes a plan → hook intercepts → `apps/viewer` saves to `~/.symbiot/history/{project}/{slug}/00N.md` → browser opens → Plate renders the markdown read-only → reviewer can drop **one anchored Comment** → Approve or Request-changes → server resolves → agent receives the decision. Validates Pattern A (from Phase 0) in the real product context.

## Exit criteria

- [x] `bun run hook:install` installs the Claude Code hook into `~/.claude/settings.json`. (Original plan said `bun symbiot install-hook`; current command is `bun run hook:install` at the root or `bun run install-hook` inside `apps/hook`.)
- [x] Triggering Claude Code's plan-finish event opens a browser at `http://127.0.0.1:<port>/`. **Event used: `PreToolUse` with matcher `ExitPlanMode`** — not `Stop` as the original plan suggested. See completion notes.
- [~] Plan renders in Plate read-only with **partial** markdown fidelity for the FR-1.2 element set: ✅ headings, paragraphs, ordered/unordered/nested lists, inline code, blockquotes, links, horizontal rules, bold/italic/strikethrough; ⚠️ task lists render as `[ ]` / `[x]` text (no list plugin); ⚠️ tables render as raw pipes (no `@platejs/table`); ⚠️ fenced code blocks render text-only (no Prism syntax highlighting); ⚠️ heading sizes flat (no `@tailwindcss/typography`); 🚫 images deferred to Phase 3 (`/api/image` endpoint). Gaps tracked under [Completion notes](#completion-notes) and rolled into Phase 3.
- [x] Selecting text shows a floating toolbar with one action: **Comment**. Built as a custom `selectionchange`-tracked Popover in `packages/symbiot-editor/src/SelectionToolbar.tsx` because `@platejs/floating-toolbar` doesn't fire on `contenteditable=false` content (Phase 0 risk realized).
- [~] Clicking Comment currently uses `window.prompt` for the body. shadcn `Popover` + `Textarea` composer (`CommentComposer`) is built and exported from `@symbiot/ui`, but the editor still uses `prompt`. **Wire-up rolls into Phase 3** when the full annotation toolbar lands.
- [x] Saving applies a `comment` + `comment_<uuid>` mark pair on the selection via `editor.tf.addMarks` (Pattern A).
- [x] **Approve** posts to `/api/approve`; hook exits 0; Claude Code proceeds with the original `ExitPlanMode` call.
- [x] **Request changes** posts to `/api/deny`; hook emits `{"decision":"block","reason":"<feedback>"}` on stdout, which Claude Code surfaces to the agent so it can revise the plan. Feedback markdown matches the plannotator-compatible wire format.
- [x] Server resolves and shuts down cleanly per invocation. Verified with successive hook invocations — no `EADDRINUSE`.
- [x] Comment markdown export is **byte-compatible** with the plannotator feedback format. Golden-file test (`packages/symbiot-annotations/src/serializeFeedback.test.ts`) passes against `fixtures/plannotator-reference/comment.md`, captured from plannotator's `packages/ui/utils/parser.ts::exportAnnotations` at commit `82636e1`. Source-line labels (`(lines N–M)`) intentionally omitted — Phase 3 adds block-level positions and tightens the fixture.

## Scope

### `apps/viewer/src/server` (plan mode subset)

Implement plan-mode endpoints. The route contract is plannotator-compatible so existing agent integrations can target it. Endpoints implemented:

- `GET  /api/plan` — return the current plan markdown.
- `POST /api/approve` — resolve the agent decision (approve).
- `POST /api/deny` — resolve the agent decision (request changes) with feedback markdown body.

**Skipped (later phases):**
- `/api/feedback` → Phase 3 (annotate mode).
- All `/api/plan/version*`, `/api/plan/history`, `/api/plan/vscode-diff` → Phase 4.
- `/api/upload`, `/api/image` → Phase 3.
- `/api/draft` → Phase 3.

Runtime: **Bun** (fast cold-start; CLI plugin spawns per invocation). Storage root: **`~/.symbiot/`**. Security model: localhost-only binding, CORS restricted to the local viewer origin, UUID-named temp files for uploads, extension whitelist on writes.

### `apps/hook`

Implement the Claude Code interceptor: a small CLI that registers a `PreToolUse` hook with matcher `ExitPlanMode` in `~/.claude/settings.json`, spawns the server on a free port, opens the browser, blocks on the server's resolve, and emits the agent decision back to Claude Code. All paths under `~/.symbiot/`. Three subcommands: `install-hook`, `uninstall-hook`, `run-hook`.

> The Phase 2 plan originally listed `Stop`/`PostToolUse`. `Stop` fires after every assistant turn and is too noisy; `PreToolUse` with matcher `ExitPlanMode` fires exactly when the agent presents a plan. The installer writes the absolute path to `apps/hook/src/cli.ts` (Bun runs `.ts` directly); the bundled `dist/cli.js` is not used at install time because bundling rewrites `import.meta.url` and breaks the viewer's static-asset path math.

### `packages/symbiot-editor`

Actual Plate composition that shipped (Plate v53 exports singular plugins, not "Kit" arrays):

```ts
SymbiotEditorKit = [
  MarkdownPlugin,                                // @platejs/markdown
  BasicBlocksPlugin,                             // headings, paragraph, blockquote (+ HR via internal plugins array)
  BasicMarksPlugin,                              // bold, italic, code, strikethrough, …
  HorizontalRulePlugin.withComponent(HrElement), // void-element wrapper (React 19 strictness)
  CodeBlockPlugin,
  CommentPlugin,
];
```

One `ReviewEditor` component. Pattern A locked in: `readOnly={true}` default, free typing blocked at event layer (per Phase 0 findings), `editor.tf.addMarks` applies the comment marks directly while the editor stays read-only — no unlock/relock needed (Phase 0 finalized). Initial value must be deserialized via `editor.getApi(MarkdownPlugin).markdown.deserialize(markdown)` (passing a string crashes Slate-React's decoration code).

Floating toolbar is `packages/symbiot-editor/src/SelectionToolbar.tsx` — a custom `selectionchange`-tracked DOM popover, not `@platejs/floating-toolbar` (which doesn't fire on `contenteditable=false`).

### `packages/symbiot-annotations`

Walk the Plate value, extract comment marks, emit feedback markdown using the `['C', originalText, text]` compact tuple → quoted-under-anchor markdown format (wire-compatible with plannotator). Golden-file test for the one Comment flow.

### `packages/symbiot-ui`

- `ThemeProvider` supporting `system | light | dark` (minimal; full polish is Phase 7). Ship it now so the rest of the app builds against it.
- Inline pre-paint script template for future use (not yet integrated; full FOUC mitigation is Phase 7).
- Minimal top bar with Approve / Request-changes buttons.
- Empty `Sidebar` slot (real sidebar in Phase 3).
- shadcn-style primitives vendored locally: `Button`, `Popover`, `Textarea`. `Tooltip` deferred — not needed by Phase 2's two-button UI; lands with the toolbar polish in Phase 3.
- `CommentComposer` component built (Popover + Textarea + Save/Cancel, Enter/Esc bindings). **Not yet wired into the editor** — the editor uses `window.prompt` for body capture. Wire-up rolls into Phase 3 with the rest of the annotation toolbar.

## Out of scope (deferred)

- Deletion, Global Comment, Redline mode → **Phase 3**.
- Insertion, Replacement → **Phase 5**.
- Image attachments, drafts → **Phase 3**.
- Version history, diff → **Phase 4**.
- Sharing, paste service, portal → **Phase 6**.
- OpenCode / Codex / Copilot CLI / Pi / Gemini → **Phase 9**.

## Tasks

1. Scaffold `apps/viewer` (fullstack: Bun HTTP server + Vite/React client); implement the three plan-mode endpoints in `src/server/`; verify with `curl`.
2. Build `apps/hook`: Claude Code interceptor CLI; storage under `~/.symbiot/`; CLI command `symbiot`.
3. Implement Plate kit in `packages/symbiot-editor` with the kits above.
4. Implement Pattern A: event-layer typing block + programmatic `applyComment(editor, selection, body)` helper.
5. Build the Comment popover composer in `packages/symbiot-ui` using shadcn `Popover` + `Textarea`.
6. Implement comment-only serializer in `packages/symbiot-annotations`.
7. Wire end-to-end: hook → server → browser → editor → approve/deny → server resolves.
8. Golden-file test: capture a reference plannotator feedback emission for the same fixture Comment; assert byte-equivalence.

## Dependencies

- `platejs`, `@platejs/markdown`, `@platejs/comment`, `@platejs/react`, `@platejs/code-block`, `@platejs/basic-nodes`, `@platejs/floating-toolbar`
- `bun` (server runtime; pinned via `packageManager` or a per-app `package.json`)
- `vite`, `@vitejs/plugin-react`
- shadcn vendored components: `button`, `popover`, `textarea`, `tooltip` via `bunx shadcn@latest add`
- `lucide-react` (icons)

## Risks / OQs

- **OQ-1** was resolved in Phase 0. If Phase 0 chose Pattern B (always-editable, locked UI), revise the editor wrappers here accordingly.
- **R-1 (bundle size)** is observed but not gated until Phase 8.

## Verification

Standalone smoke (no Claude Code):

```sh
bun install
bun run build
bun run viewer:smoke         # boots apps/viewer against fixtures/plans/elements.md
```

Full Claude Code integration:

```sh
bun run hook:install         # writes PreToolUse(ExitPlanMode) entry into ~/.claude/settings.json
# in another terminal: launch Claude Code, ask it to plan a task, accept the plan
# → viewer opens with the proposed plan
# → click Approve / Request changes → decision round-trips to Claude Code
bun run hook:uninstall       # removes the symbiot entry; other hooks untouched
```

Automated verification matrix (CI-equivalent):

```sh
bun run typecheck    # 14 packages, 0 errors
bun run lint         # max-warnings=0
bun run test         # 5/5 vitest tests including the M2 golden-file byte-equality
bun run build        # viewer client + bin + hook CLI
bun run format:check
```

Repeatability: re-trigger the hook several times back-to-back; the server cleanly stops between invocations (no `EADDRINUSE`). Re-running `hook:install` is idempotent — the matcher (`/apps\/hook\/(src|dist)\/cli\.(ts|js).*run-hook/`) strips any previous symbiot entries from every hook group before adding the current one.

## Completion notes

Divergences from the as-written plan, captured here so future phases inherit the right defaults:

- **Hook event:** `PreToolUse` with matcher `ExitPlanMode`, not `Stop`. Stop fires too broadly.
- **Install target:** the source `apps/hook/src/cli.ts`, not the bundled `dist/cli.js`. Bundling rewrites `import.meta.url` and breaks the viewer's relative path to `dist/client/`.
- **Default static root:** `apps/viewer/src/server/startServer.ts` resolves `<srcdir>/../../dist/client` (the Vite output), not `<srcdir>/../client` (which would be source).
- **Tailwind v4 source scanning:** workspace packages are invisible to `@tailwindcss/vite` by default; `apps/viewer/src/client/styles.css` adds explicit `@source` directives for `packages/symbiot-{ui,editor}/src`. Any new workspace package emitting Tailwind classes must be added.
- **Plate void elements need React-19-safe wrappers.** `HorizontalRulePlugin.withComponent(HrElement)` overrides the default `render: { as: "hr" }` which crashes under React 19 because Slate-React always passes children to void elements. Same fix pattern applies for `<img>`, `<br>`, `<input>` if/when added.
- **Plate initial value must be a deserialized array, not markdown.** `value: (e) => e.getApi(MarkdownPlugin).markdown.deserialize(markdown)`. Passing a string crashes `splitDecorationsByChild`.
- **`@platejs/floating-toolbar` skipped.** Doesn't fire on `contenteditable=false`. Custom DOM `selectionchange` toolbar in `SelectionToolbar.tsx` is the replacement.
- **`CommentComposer` not yet wired.** Editor uses `window.prompt` for the comment body. Phase 3 swaps in the Popover composer.
- **Golden fixture lacks source-line labels.** Plannotator's `exportAnnotations` emits `## N. (lines A–B) Feedback on …` when the annotation's block has resolvable source lines. Symbiot Phase 2 doesn't carry block-line metadata yet; the fixture (`fixtures/plannotator-reference/comment.md`) and serializer match the no-line-label form. Phase 3 tightens this.
- **FR-1.2 markdown coverage gaps** carried into Phase 3:
  - Tables → add `@platejs/table` to `SymbiotEditorKit`.
  - Task lists → add list/task plugin so `[ ]` / `[x]` render as checkboxes.
  - Code syntax highlighting → integrate Prism via `CodeBlockPlugin` configuration (lazy-loaded language imports; full code-splitting is Phase 8).
  - Heading sizes / prose typography → install `@tailwindcss/typography`, enable the plugin, `prose` class on the editor container will then apply.
  - Images → ship with `/api/image` + `/api/upload` in Phase 3.

## Reference: shipped commands

| script | location | purpose |
|---|---|---|
| `bun run hook:install` | root | install the PreToolUse(ExitPlanMode) hook |
| `bun run hook:uninstall` | root | remove every symbiot hook entry |
| `bun run viewer:smoke` | root | boot the viewer against `fixtures/plans/elements.md` |
| `bun run install-hook` / `uninstall-hook` / `run-hook` | `apps/hook` | same, package-scoped |
| `bun run smoke` / `dev` / `start` / `start:prod` | `apps/viewer` | dev server, source bin, built bin |
