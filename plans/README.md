# symbiot — Implementation phases

Read [`../PRD.md`](../PRD.md) for product context first. This directory sequences the rewrite into 10 phases. Each phase file is self-contained: a developer can read one file and execute that phase without re-reading the PRD.

## Phasing

| # | Status | File | Goal |
|---|---|---|---|
| 0 | ✅ Complete (2026-05-18) | [`00-spike.md`](./00-spike.md) | Prove Pattern A (read-only Plate + transient suggestion authoring, OQ-1). Go/no-go gate. **PASS** — Pattern A works without read-only toggling; `editor.tf.*` bypasses DOM `contenteditable=false`. |
| 1 | ✅ Complete (2026-05-19) | [`01-bootstrap.md`](./01-bootstrap.md) | **Bun + Turborepo** monorepo bootstrap (core settings only). |
| 2 | ✅ Complete (2026-05-19) | [`02-mvp.md`](./02-mvp.md) | Claude Code hook → **apps/viewer (consolidated fullstack)** → Plate render → Approve/Deny + anchored Comment. **PASS** — end-to-end loop works against a real Claude Code session; M2 golden file holds. Known cosmetic gaps (tables / task lists / syntax highlighting / Tailwind Typography) are non-blocking and roll into Phase 3 polish. |
| 3 | ✅ Complete (2026-05-19) | [`03-critical-features.md`](./03-critical-features.md) | The 3 plan-review annotation types (Comment, Global Comment, Deletion), Review + Redline modes, sidebar, feedback export. **Split into four sub-phases:** |
| 3.0 | ✅ Complete (2026-05-19) | [`03-0-playwright-bdd.md`](./03-0-playwright-bdd.md) | Playwright-BDD harness landed. 15/15 scenarios green; conventions documented in `features/README.md`. |
| 3.1 | ✅ Complete (2026-05-19) | [`03-1-wire-format-and-markdown.md`](./03-1-wire-format-and-markdown.md) | Codec (C/G/D) + dual-anchor + walker + CommentComposer + GFM + `@tailwindcss/typography` + Shiki dual-themed highlighting + `SourceLinesPlugin` (`editor.api.getBlockLines(path)`) + explicit table-element wrappers + three synthesized golden fixtures (`global-comment.md`, `deletion.md`, `mixed.md` — byte-equality in `serializeFeedback.test.ts`). |
| 3.2 | ✅ Complete (2026-05-19) | [`03-2-deletion-modes-sidebar.md`](./03-2-deletion-modes-sidebar.md) | Deletion authoring + Global Comment composer + M2 gate + `RedlineEditor` (Delete/Backspace keystroke) + Review/Redline `ToggleGroup` in top bar (localStorage-persisted) + `AnnotationSidebar` (Tabs/Badge/AlertDialog clear-all) + 7 shadcn primitives (`Sidebar`, `ToggleGroup`, `DropdownMenu`, `Tabs`, `Badge`, `AlertDialog`, `Tooltip`) + strikethrough leaf renderer for `suggestion` marks. |
| 3.3 | ✅ Complete (2026-05-19) | [`03-3-images-drafts-annotate.md`](./03-3-images-drafts-annotate.md) | `/api/upload` + `/api/image` (security model) + `/api/draft` + `/api/feedback` + drafts hook + `symbiot annotate <file.md>` CLI + `@platejs/media` `ImagePlugin.withComponent(VoidImage)` + `ImageAttachButton` / `ImagePreviewList` wired into both composers + `features/plan-review/image-attach.feature`. |
| 4 | ✅ Complete (2026-05-22) | [`04-versioning.md`](./04-versioning.md) | Plan version history + `@platejs/diff` inline diff; annotations survive version changes. **Split into sub-phases:** |
| 4.1 | ✅ Complete (2026-05-21) | [`04-versioning.md`](./04-versioning.md) | History sidebar tab + `VersionBrowser` + `/api/plan/versions` + `/api/plan/version?n=N` + `listVersions()` storage helper + `drifted?` field on `AnnotationSidebarEntry` + Playwright-BDD `version-history.feature`. Shipped in PR #30. |
| 4.2 | ✅ Complete (2026-05-22) | [`04-versioning.md`](./04-versioning.md) | `@platejs/diff@53.0.0` integration: `DiffPlugin` (key `"diff"`, `withGetFragmentExcludeDiff`), `SymbiotDiffKit`, `DiffEditor` + `DiffLeaf` + `diffElementWrapper`, Clean/Raw `ToggleGroup` inside the History tab, read-only diff render on non-current versions, smoke fixtures (`fixtures/diff-reference/`, `fixtures/plans/elements-revised.md`), Playwright-BDD `version-history-diff.feature`, and the new `docs/` reference tree. |
| 4.3 | ✅ Complete (2026-05-22) | [`04-versioning.md`](./04-versioning.md) | Drift detection wired through `walkAnnotations` via `commentOriginalTexts` / `suggestionOriginalTexts` sidecar maps (captured at creation, persisted in the draft, fed back on hydration) + `resolveAnchor` "missing" → `drifted: true` → sidebar destructive badge. `POST /api/plan/vscode-diff` spawns `code --diff <from> <to>` detached (plannotator-compatible; 503 `code-cli-missing` when `code` not on PATH). `Compare with previous` button in the History panel lifts the `isHistorical` gate so the reviewer can diff current vs predecessor without remounting. Playwright-BDD `drift-detection.feature` + `predecessor-diff.feature`. |
| 5 | ✅ Complete (2026-05-22) | [`05-extended-annotations.md`](./05-extended-annotations.md) | Insertion + Replacement — net-new symbiot annotation types completing the 5-type set. **Split into sub-phases:** |
| 5.1 | ✅ Complete (2026-05-22) | [`05-extended-annotations.md`](./05-extended-annotations.md) | Codec tuples `['I',…]` / `['R',…]` + walker entries + `serializeFeedback` formatters (`Insert after:` / `Suggest replacing:` / `> Replace with:`) + per-kind sidecar maps for drift. Shipped in commit `8086ae1`. |
| 5.2 | ✅ Complete (2026-05-22) | [`05-extended-annotations.md`](./05-extended-annotations.md) | Generalized `applyAnnotation(editor, kind)` + polymorphic `AnnotationComposer(kind)` + Insert toolbar button + `InsertionMarkPlugin`/`InsertionLeaf` + three insertion sidecar maps threaded through `EditorSnapshot` → `useReviewState` → `useDraft` → `DraftPayload` → `sidebarProjection`. Shipped in commit `5fd5774`. |
| 5.3 | ✅ Complete (2026-05-22) | [`05-extended-annotations.md`](./05-extended-annotations.md) | Replace toolbar button + `ReplacementMarkPlugin`/`ReplacementLeaf` + replacement composer surface + three replacement sidecar maps threaded through the same channel + PRD v1.2 (§8.4 rewritten, OQ-1 closed) + `replacement.feature` golden path. Closes Phase 5; M1 holds. |
| 6 | ⏳ Pending | [`06-sharing.md`](./06-sharing.md) | Share codec (URL hash + `deflate-raw` + base64url), encrypted paste service, Import Review, static portal. |
| 7 | ✅ Complete (2026-05-22) | [`07-theming.md`](./07-theming.md) | System / light / dark with OS default, no FOUC, AA-contrast annotation tokens, theme toggle. **Split into sub-phases:** |
| 7.1 | ✅ Complete (2026-05-22) | [`07-theming.md`](./07-theming.md) | `ThemeProvider` hardening (system / light / dark resolution, OS preference listener, `symbiot.theme` localStorage persistence, sync `.dark` class on `<html>`). |
| 7.2 | ✅ Complete (2026-05-22) | [`07-theming.md`](./07-theming.md) | Settings dialog (shadcn `Dialog`) with theme `ToggleGroup` in the top bar. |
| 7.3 | ✅ Complete (2026-05-22) | [`07-theming.md`](./07-theming.md) | AA-verified OKLCH hues for the four annotation tokens × two themes + `docs/theming.md` (values, hex equivalents, contrast ratios, methodology) + viewer/portal inline pre-paint script. |
| 7.4 | ✅ Complete (2026-05-22) | [`07-theming.md`](./07-theming.md) | Automated contrast unit test (JSDOM + inline OKLCH → sRGB → WCAG 2.1 luminance math) and Phase 7 close-out. Closes **M7** (AA contrast + no FOUC). |
| 8 | ⏳ Pending | [`08-hardening.md`](./08-hardening.md) | Bundle size to NFR-1, single-file viewer HTML, a11y pass, cross-browser, CI/CD scaffolding. |
| 9 | ⏳ Pending | [`09-wide-agents.md`](./09-wide-agents.md) | OpenCode plugin → Codex CLI → Copilot CLI → Pi / Gemini / others. |

### Phase 2 architectural decisions (carry-forward for later phases)

- **Server logic + browser UI consolidated in `apps/viewer`.** No separate `packages/symbiot-server` — the Phase 1 placeholder is removed at the top of Phase 2. The Bun HTTP server lives in `apps/viewer/src/server/` next to the React/Vite client in `apps/viewer/src/client/`, built into a single binary. Phase 9 agent integrations (`apps/hook`, future `apps/copilot`, `apps/gemini`, …) all spawn the same `apps/viewer` binary; they differ only in CLI shape.
- **Hook event is `PreToolUse` with matcher `ExitPlanMode`** — NOT `Stop`. Stop fires after every assistant turn; `PreToolUse(ExitPlanMode)` fires exactly when the agent presents a plan and gives us a clean spot to block with feedback. Decision response shape: exit 0 = approve; `{"decision":"block","reason":"<feedback>"}` on stdout = request changes. The Phase 2 plan originally listed `Stop`/`PostToolUse`; corrected in execution.
- **Hook command points at source `cli.ts`, not the bundle.** `bun build` inlines `@symbiot/viewer` into the bundle and rewrites `import.meta.url`, which breaks the viewer's relative path math to `dist/client/`. Installer writes `bun /abs/path/apps/hook/src/cli.ts run-hook`. Bun runs `.ts` directly; no bundling step needed for the hook.
- **Selection toolbar is a custom DOM-`selectionchange` listener** in `packages/symbiot-editor/src/SelectionToolbar.tsx`, not `@platejs/floating-toolbar`. Plate's FloatingToolbar doesn't fire on `contenteditable=false` content — Phase 0 spike flagged this; Phase 2 realized the fallback. Phases 3+ can keep the same component or swap to Plate's once Plate ships read-only support.
- **Plate void elements need wrappers in React 19.** Plate's `HorizontalRulePlugin` renders `<hr>` directly via `render: { as: "hr" }`. Slate-React always hands a zero-width text node as `children`; React 19 rejects children on void HTML elements. Fix: `HorizontalRulePlugin.withComponent(HrElement)` wraps in a div with `<hr/>` next to a hidden `<span>{children}</span>`. Same pattern applies to any future void element (`<img>`, `<br>`, `<input>`).
- **Plate initial-value must be a deserialized array, not a markdown string.** `usePlateEditor({ value: markdownString })` triggers `splitDecorationsByChild` on `undefined` because Slate's `useChildren` runs before the markdown auto-deserializer. Fix: `value: (e) => e.getApi(MarkdownPlugin).markdown.deserialize(markdown)`.
- **Tailwind v4 only scans the project root** (e.g. `apps/viewer`). Workspace package class names need explicit `@source` directives. The viewer's `styles.css` declares `@source "../../../../packages/symbiot-ui/src";` and `@source "../../../../packages/symbiot-editor/src";`. Every new workspace package that emits Tailwind classes must be added.
- **Plannotator wire format pinned without source-line labels** (`(lines N–M)`). Phase 2 doesn't carry block-level source positions through the Plate value yet. Golden fixture under `fixtures/plannotator-reference/comment.md` documents the gap; Phase 3 tightens it when the full annotation pipeline lands.
- **End-to-end test harness is Playwright-BDD** (committed in CLAUDE.md §10.4; scaffolding lands in Phase 3.0). `features/` lives at the repo root with subdirs per area (`plan-review/`, `markdown/`, `annotate/`, `server/`); step helpers are **pure functions** (no class state); UI selectors are `data-testid="<kebab-case>"` exclusively — never class names or text content. Each Phase 3 sub-phase (3.1 / 3.2 / 3.3) ships `.feature` specs alongside its code; later phases follow the same convention.

### Phase 4 architectural decisions (carry-forward for later phases)

- **Version-browsing endpoints are GET-only and Zod-validated.** `GET /api/plan/versions` returns `{ versions: number[], current: number }`; `GET /api/plan/version?n=N` returns `{ plan, meta }`. `n` is whole-string matched against `^[1-9]\d*$` (`Number.parseInt` is prefix-tolerant — `"1abc"` would otherwise sneak through). ENOENT maps to `404`; bad input to `400`. Routes registered via the central `apiRoutes` registry so the client `apiClient` is the only consumer that names paths.
- **Active version only renders the diff for *historical* selections.** `useVersionState` derives `isHistorical = activeVersion !== bootVersion`. The current version stays editable so annotation authoring keeps working. Showing the diff for "what changed in the newest revision" needs a third boot (smoke flow documented in `fixtures/plans/README.md`); a first-class affordance is Phase 4.3 work.
- **Diff plugin namespacing avoids the suggestion-mark collision (R-5).** `DiffPlugin` uses Plate key `"diff"` — distinct from `"suggestion"` / `"comment"`. `SymbiotDiffKit` mirrors the base markdown plugins but omits `SuggestionMarkPlugin` and `CommentPlugin` so leaf keys cannot collide. Accept / reject UI is wired against `"suggestion"`, so diff nodes are unreachable from feedback flows.
- **`aboveNodes` render hooks must return `children` for unchanged nodes, not `undefined`.** Returning `undefined` causes Plate to drop the element entirely from the rendered tree. `DiffPlugin.aboveNodes` (in `DiffLeaf.tsx`) returns `children` whenever `element.diff !== true`. This silently broke the Clean view during 4.2 iteration; preserved as a project-wide rule.
- **Per-render-mode editors use the parent's `key` prop, not `usePlateEditor` deps.** `DiffMount` re-keys `DiffEditor` on `mode` so a fresh Plate editor is constructed with the right initial value when the reviewer flips Clean ↔ Raw. Mixing `usePlateEditor`'s `deps` argument with conditional value computation produced stale renders.
- **Async state in version hooks uses request-id refs + derived state.** `useVersionState` guards `fetchPlanVersion` with `latestActiveRequestRef` / `latestPreviousRequestRef` so slow responses can't overwrite a newer selection. `previousPlan` is derived from a `previousFetched: { version, plan }` state matched against the current `previousVersion`, avoiding the React-Compiler-flagged sync `setState` inside `useEffect`.
- **`docs/` is the home for cross-cutting architectural reference.** Per-package READMEs describe their surface; `docs/architecture.md` collects "architectural specials" (decisions easy to break by accident), and `docs/version-history.md` is the version-history + diff deep dive. Status stays in this file; `docs/` is timeless reference.
- **Drift detection is sidecar-driven.** `originalText` is captured at annotation creation (`applyComment.ts`, `applyDeletion.ts` already returned it) and persisted as two optional draft maps — `commentOriginalTexts` and `suggestionOriginalTexts`. The walker accepts the same maps and calls `resolveAnchor()` only when supplied; absent maps mean "legacy draft" and the walker emits no drift signal. This keeps the draft wire-format backward-compatible AND keeps drift detection out of the codec — the sidebar UI is the only consumer of `drifted: true`. Future phases that re-anchor annotations across version bumps inherit the same channel.

### Phase 7 architectural decisions (carry-forward for later phases)

- **`symbiot.theme` localStorage key persists *explicit* choices only.** `system` is never persisted — selecting it removes the key (`writeStoredTheme("system")` calls `removeItem`), so the next reload falls back to the OS preference via `matchMedia('(prefers-color-scheme: dark)')`. Reads return `null` and writes are no-ops when `localStorage` is undefined (SSR/Node guard). Any future setting that should opt-in-override the OS follows the same convention. Verified by `packages/symbiot-ui/src/components/ThemeProvider.test.ts`.
- **Inline pre-paint script in every Vite `index.html`.** Each Vite app's `index.html` ships a `<script>` inlined in `<head>` BEFORE the module script. It reads `localStorage.getItem('symbiot.theme')`, falls back to `matchMedia('(prefers-color-scheme: dark)')`, sets `document.documentElement.classList` and `document.documentElement.style.colorScheme`, and is wrapped in `try/catch` for storage `SecurityError`. The contract is locked per-app by `*/indexHtml.test.ts` (canonical template: `apps/viewer/src/server/indexHtml.test.ts`). `apps/viewer` and `apps/portal` both ship the script today; any future Vite app re-uses it verbatim.
- **Contrast tests live next to the token file.** `packages/tailwind-config/contrast.test.ts` reads `theme.css` from disk, injects the `:root` and `.dark` blocks into a single JSDOM instance, and asserts every annotation token meets WCAG AA (>= 4.5:1) against `--background` via `getComputedStyle(document.documentElement)` and inline OKLCH → linear sRGB → relative-luminance math (formula in `docs/theming.md`). Adding a new annotation token to `theme.css` requires extending the test's `tokens` tuple; adding a new theme requires extending the `themes` tuple. JSDOM was picked over Playwright (faster, no browser to boot for a values check) and over `axe-core` (which operates one level higher — rendered element + font-weight rules — than this token-level check).
- **`dark:` variant is class-based, not media-query-based.** `packages/tailwind-config/theme.css` overrides Tailwind v4's `prefers-color-scheme` default with `@custom-variant dark (&:is(.dark *))` — the exact selector shadcn's Tailwind v4 template ships — so the variant tracks `ThemeProvider`'s `.dark` toggle on `<html>` and carries the `.dark` class specificity shadcn components expect. An explicit user-selected Light overrides OS Dark (FR-14.3). Without this, `dark:`-prefixed utilities — most visibly `dark:prose-invert` on the editor wrapper — activate from OS preference alone, flipping `--tw-prose-*` to invert-mode values on a light background.

### Phase 0 findings (carry-forward for later phases)

- **Pattern A simpler than PRD §8.4 anticipated.** `<PlateContent readOnly />` sets `contenteditable=false` at the DOM. `editor.tf.*` transforms bypass it entirely — no unlock/relock needed. Phase 2 will use plain `editor.tf.addMarks(...)` and `editor.setOption(SuggestionPlugin, 'isSuggesting', true)` + `editor.tf.delete()` while the editor stays `readOnly={true}` the whole time. PRD §8.4 should be updated in v1.2 to reflect this.
- **Plate v53 is the validated baseline.** `platejs@53.0.3` plus `@platejs/{markdown,comment,suggestion,diff,basic-nodes,code-block}@53.x`. Lock these versions in `01-bootstrap.md` workspace deps.
- **Bundle baseline: 350.82 kB gzipped** (single chunk, no code-splitting). Plate-based editors run heavier than hand-rolled markdown editors; budgeted in NFR-1. Phase 8 must lazy-load + code-split highlight languages to hit 1.5s interactive on <50KB plans.
- **Cross-browser:** only Chromium verified in spike. Firefox + Safari deferred to Phase 8 cross-browser gate (NFR-6).
- **Toolchain locked: Bun + Turborepo.** Bun is the package manager + runtime for `apps/hook` and CLI tools (PRD §8). Turborepo provides task graph/caching. ESLint flat config (v10) with `jiti` for TS loading; Prettier 3 + `prettier-plugin-tailwindcss`; TypeScript project references; commitlint + husky.

## Inspiration & prior art

symbiot's product concept — intercept an AI agent's plan, let a human annotate it in a browser, send structured feedback back — is **inspired by [plannotator](https://github.com/backnotprop/plannotator)** (MIT). Credit and thanks to that project for proving the workflow.

symbiot is an **independent, ground-up implementation** with its own architecture (PlateJS-based editor, Bun runtime, shadcn/ui design system, fresh naming throughout). No source is copied; the design borrows the workflow shape and a few public wire-format details so the two tools can interoperate.

### What is shared, and why

- **Annotation tuple shape** (`['C',…]`, `['G',…]`, `['D',…]`) — kept identical so share URLs and feedback markdown round-trip between the two tools. symbiot adds `['I',…]` and `['R',…]` as its own extensions.
- **Plan-review HTTP route names** — kept compatible so existing third-party agent integrations can target the symbiot server without changes.

### What is different

- **Editor:** PlateJS + Plate Suggestion / Diff / Comment kits — not a hand-rolled markdown parser, block model, or line-diff engine.
- **Runtime:** Bun for server + CLI tools; Turborepo for the monorepo.
- **Design system:** shadcn/ui + Tailwind v4 with symbiot's own tokens and `--anno-*` color scale; no visual mimicry.
- **Annotation set:** 5 types (Comment, Global Comment, Deletion, **Insertion**, **Replacement**) — Insertion and Replacement are symbiot-only.
- **Scope:** plan annotation + arbitrary markdown annotation only. Code-review mode is explicitly out of scope (PRD NG2).
- **Storage / naming:** `~/.symbiot/`, `@symbiot/*` packages, `symbiot` CLI — no shared paths or identifiers.

## PRD reconciliation (must-fix during execution)

The PRD (v1.1) was validated against the plannotator concept and its public source. Decisions baked into these phases:

| PRD claim | Reality | Decision |
|---|---|---|
| 5 annotation types | The reference implementation ships **3 only**: Comment, Global Comment, Deletion. | Phase 3 ships those 3 types for wire-format compatibility. Insertion + Replacement land in **Phase 5** as net-new symbiot features. |
| `~/.symbiot/` + `symbiot` CLI + `symbiot-*` packages | symbiot uses its own paths and naming throughout. | **Fresh product, no migrator.** R-7 dropped. |
| Apps list in PRD §8.1 | Some agent integrations (Copilot, Gemini) live in their own apps; others (review, skills, vscode-extension) are deprecated or backlog. | Phase 9 covers `apps/copilot` and `apps/gemini`. `apps/review` dropped per NG2. `apps/skills` / `apps/vscode-extension` → backlog. |
| `packages/symbiot-server` listed in PRD §8.1 workspace tree | Server is a thin Bun HTTP layer tightly coupled to the Vite-built client. A separate package adds workspace ceremony without an independent consumer. | **Consolidated into `apps/viewer`** at the start of Phase 2; the Phase 1 placeholder is deleted. All agent integrations spawn `apps/viewer`. |
| Server endpoints §15 | Some endpoints (`/api/goal-setup`, external-annotations API) are code-review-adjacent. | Add `/api/goal-setup` in Phase 3 if surfaced. External-annotations API dropped. |
| Improvement hooks / archive mode | Concepts in scope of plan-review tools generally; PRD silent. | Backlog. Not in this plan. |

## Cross-phase gates

- **After Phase 2:** Real Claude Code Approve cycle works end-to-end from a fresh clone.
- **After Phase 3:** M2 holds — feedback markdown is byte-compatible with the reference plan-review format for the 3 shared annotation types (verified by golden-file tests).
- **After Phase 5:** 5-type set complete; M1 holds.
- **After Phase 6:** M4 holds (share round-trip lossless); UC4 works.
- **After Phase 7:** M7 holds (AA contrast, no FOUC).
- **After Phase 8:** NFRs 1–9 all pass; M5, M6 hold.
- **After Phase 9:** Each retained agent integration ships against the symbiot server.

## Phase-file structure

Every phase file follows the same shape:

- **Goal** — one paragraph.
- **Exit criteria** — checklist.
- **Scope** — what's in.
- **Out of scope** — what's deferred and to which later phase.
- **Tasks** — numbered, each a reviewable chunk.
- **Files to create/touch** — paths, grouped by package.
- **Dependencies** — npm packages, pinned versions where known.
- **Risks & open questions** — links to PRD §12 IDs where relevant.
- **Verification** — commands to run; manual smoke test steps.

## Design choices

Decisions baked into the phase plans, each documented in the phase it lands.

- **Monorepo scaffolding:** Bun workspaces + Turborepo + flat ESLint 10 + Prettier 3 + commitlint + husky — see `01-bootstrap.md`.
- **Server contract:** the public HTTP surface is **plannotator-compatible** for the plan-review subset (route names + JSON shapes) so existing agent integrations work without changes. Code-review endpoints are dropped (NG).
- **Agent hook IPC:** symbiot's hook design follows the same shape as plannotator's (single CLI invoked by the agent → spawn a local server → open the browser → block on resolve). Re-implemented from scratch on Bun.
- **Share codec:** zero-knowledge URL-fragment encoding (`deflate-raw` + base64url, optional AES-256-GCM). Binary layout is **interoperable with plannotator's** so share URLs round-trip across both tools where annotation types overlap.
- **Annotation tuple wire format:** `['C',…]`, `['G',…]`, `['D',…]` preserved for interop. `['I',…]` and `['R',…]` added as symbiot extensions in Phase 5.
