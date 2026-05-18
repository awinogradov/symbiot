# symbiot — Implementation phases

Read [`../PRD.md`](../PRD.md) for product context first. This directory sequences the rewrite into 10 phases. Each phase file is self-contained: a developer can read one file and execute that phase without re-reading the PRD.

## Phasing

| # | Status | File | Goal |
|---|---|---|---|
| 0 | ✅ Complete (2026-05-18) | [`00-spike.md`](./00-spike.md) | Prove Pattern A (read-only Plate + transient suggestion authoring, OQ-1). Go/no-go gate. **PASS** — Pattern A works without read-only toggling; `editor.tf.*` bypasses DOM `contenteditable=false`. |
| 1 | ✅ Complete (2026-05-19) | [`01-bootstrap.md`](./01-bootstrap.md) | **Bun + Turborepo** monorepo bootstrap (core settings only). |
| 2 | ⏳ Pending | [`02-mvp.md`](./02-mvp.md) | Claude Code hook → symbiot server → Plate render → Approve/Deny + anchored Comment. |
| 3 | ⏳ Pending | [`03-critical-features.md`](./03-critical-features.md) | The 3 plan-review annotation types (Comment, Global Comment, Deletion), Review + Redline modes, sidebar, feedback export. |
| 4 | ⏳ Pending | [`04-versioning.md`](./04-versioning.md) | Plan version history + `@platejs/diff` inline diff; annotations survive version changes. |
| 5 | ⏳ Pending | [`05-extended-annotations.md`](./05-extended-annotations.md) | Insertion + Replacement — net-new symbiot annotation types completing the 5-type set. |
| 6 | ⏳ Pending | [`06-sharing.md`](./06-sharing.md) | Share codec (URL hash + `deflate-raw` + base64url), encrypted paste service, Import Review, static portal. |
| 7 | ⏳ Pending | [`07-theming.md`](./07-theming.md) | System / light / dark with OS default, no FOUC, AA-contrast annotation tokens, theme toggle. |
| 8 | ⏳ Pending | [`08-hardening.md`](./08-hardening.md) | Bundle size to NFR-1, single-file viewer HTML, a11y pass, cross-browser, CI/CD scaffolding. |
| 9 | ⏳ Pending | [`09-wide-agents.md`](./09-wide-agents.md) | OpenCode plugin → Codex CLI → Copilot CLI → Pi / Gemini / others. |

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
| Server endpoints §15 | Some endpoints (`/api/goal-setup`, external-annotations API) are code-review-adjacent. | Add `/api/goal-setup` in Phase 3 if surfaced. External-annotations API dropped. |
| Improvement hooks / archive mode | Concepts in scope of plan-review tools generally; PRD silent. | Backlog. Not in this plan. |

Follow-up (not done by this plan): bump PRD to v1.2 with the reconciliation changelog.

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
