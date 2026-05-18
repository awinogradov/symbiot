# Phase 1 — Monorepo bootstrap

## Goal

Stand up symbiot's Bun + Turborepo monorepo skeleton with an opinionated, OSS-friendly dev experience. Scoped to **core monorepo tooling only** — no Storybook, no CI workflows yet (those land in Phase 8).

> Toolchain: Bun is the package manager and the JS runtime for `apps/hook` and CLIs (CLAUDE.md §2.1, PRD §8). Turborepo provides the task graph and caching. ESLint flat config, Prettier, TypeScript project references, commitlint, husky.

## Exit criteria

- [ ] `bun install` succeeds clean from a fresh tree.
- [ ] `bun run dev`, `bun run build`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run format` all run via Turborepo with caching.
- [ ] Conventional Commits enforced via commitlint + husky `commit-msg`.
- [ ] Lint-staged runs on `pre-commit` (ESLint + Prettier).
- [ ] Shared config packages (`@symbiot/typescript-config`, `@symbiot/eslint-config`, `@symbiot/prettier-config`, `@symbiot/tailwind-config`) installable via `workspace:*`.
- [ ] `apps/` and `packages/` globs declared; one placeholder package per planned workspace name exists (compile-only, no real code yet).
- [ ] Node 24 pinned via `.nvmrc`; Bun pinned in `packageManager`.

## Scope — root files

- **Bun workspaces** ← declared in root `package.json` (`workspaces: ["apps/*", "packages/*"]`). No `pnpm-workspace.yaml`, no `.npmrc`.
- **`turbo.json`** — `globalDependencies` includes `tsconfig.json`, `eslint.config.ts`, `packages/typescript-config/*.json`, `.prettierignore`, `bun.lock`; `globalEnv: ["NODE_ENV"]`; `globalPassThroughEnv` for CI/Turbo/path vars. Pipeline tasks: `build`, `dev`, `lint`, `typecheck`, `test`, plus a `bundle-analyze` task (used in Phase 8) and `clean`.
- **`.editorconfig`**, **`.nvmrc`** (`24`), **`.gitignore`**, **`.prettierignore`** — standard OSS defaults.
- **`lint-staged.config.ts`** — TypeScript config (`*.{ts,tsx}` → eslint+prettier, `*.{css,md,json}` → prettier). Use `import type { Configuration } from "lint-staged"` for type safety. lint-staged 17+ auto-discovers `lint-staged.config.ts`.
- **`commitlint.config.ts`** — TypeScript config typed via `import type { UserConfig } from "@commitlint/types"`. Extends `@commitlint/config-conventional`. Two custom inline plugin rules: **no issue IDs in subject** (branch name handles linking) and **no AI Co-authored-by trailers**.
- **`.husky/pre-commit`** (`bunx lint-staged`) and **`.husky/commit-msg`** (`bunx --no -- commitlint --edit "$1"`).
- **`.husky/pre-push`** — branch-name validator, **relaxed**: enforce kebab-case + length limits only; no issue-ID requirement (symbiot has no issue tracker yet).
- **Root `package.json`:** `private: true`, `type: "module"`, `engines.node: ">=24"`, `packageManager: "bun@<installed-version>"`, top-level scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `format`, `prepare: husky`).
- **Root `tsconfig.json`** extends `@symbiot/typescript-config/base.json`; `noEmit: true`; project references to every workspace; `include` lists the root TS configs (`eslint.config.ts`, `commitlint.config.ts`, `lint-staged.config.ts`, `vitest.config.ts`).
- **Root `eslint.config.ts`** (flat ESLint 10) referencing `@symbiot/eslint-config` rulesets `COMMON`, `TYPESCRIPT`, `NODE`. The `REACT` ruleset is consumed by browser packages.

## Scope — shared config packages (under `packages/`)

Each config package ships with a `README.md` documenting usage.

- **`@symbiot/typescript-config`** — `base.json`, `react.json`, `node.json`.
- **`@symbiot/eslint-config`** — `COMMON`, `TYPESCRIPT`, `NODE`, `REACT`, `BROWSER`, `VITEST` ruleset factories composed via `configure()`.
- **`@symbiot/prettier-config`** — Prettier preset; includes `prettier-plugin-tailwindcss`.
- **`@symbiot/tailwind-config`** — Tailwind v4 theme tokens (PRD §10) + annotation color tokens `--anno-delete`, `--anno-insert`, `--anno-replace`, `--anno-comment` defined for **both** light and dark themes. AA contrast verification is Phase 7; here we set placeholder hues.

## Scope — placeholder workspaces

Each is an empty package with valid `package.json` + `tsconfig.json` + `src/index.ts` (`export {}`) + `README.md` (purpose, phase when it lands, scripts). Real implementations come in later phases.

```
apps/
├── hook/              # Phase 2
├── portal/            # Phase 6
└── marketing/         # Phase 9 or later

packages/
├── symbiot-server/        # Phase 2 (plan mode only) → Phase 3 (annotate mode) → Phase 4 (versioning)
├── symbiot-editor/        # Phase 2 (minimal kit) → Phase 3 (full annotations) → Phase 4 (diff)
├── symbiot-annotations/   # Phase 2 (Comment codec) → grows each phase
└── symbiot-ui/            # Phase 2 (ThemeProvider + minimal top bar)
```

## Out of scope (deferred)

- **Storybook** for `symbiot-ui` — Phase 8 if needed.
- **CI workflows (`.github/workflows`)** — Phase 8.
- **Database (Prisma/Kysely/Postgres)** — never (symbiot's storage is filesystem only).
- **Plate kit wiring** — Phase 2.
- **Real shadcn components** — Phase 2 (just one or two needed) and Phase 3 (the full set).

## Tasks

1. `git init` already done. Add the root files listed in Scope, one-by-one, verifying each step's `bun install` is clean.
2. Author the four shared config packages with the rulesets/tokens listed.
3. Add the placeholder workspaces; each has a `package.json` with `name`, `version: "0.0.0"`, `private: true`, `type: "module"`, and an `index.ts` that exports nothing.
4. Wire root `tsconfig.json` project references and `include` (the TS configs at root: `eslint.config.ts`, `commitlint.config.ts`, `lint-staged.config.ts`, `vitest.config.ts`).
5. Run the full `bun run` script matrix and verify green. No commits in this phase.

## Dependencies

Root devDependencies (latest-stable on install):

- `turbo`
- `typescript`, `eslint`, `prettier`, `prettier-plugin-tailwindcss`
- `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`, `@commitlint/types`
- `tailwindcss` (v4)
- `vitest` (for the `test` task; per-package tests come later)
- `jiti` (ESLint 10's loader for `.ts` flat config files)
- **Bun itself is pinned via `packageManager` field** — also the JS runtime for `apps/hook` and CLIs per PRD §8.

## Risks / OQs

- **None of the PRD §12 risks apply here.** This phase is mechanical.
- **Bun + Turborepo:** verify `packageManager: "bun@…"` is honored by Turbo for script invocation; confirm `eslint.config.ts` loads via Bun's native TS (no `tsx`/`ts-node`).

## Verification

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build
bun run format:check
```

All green on macOS and a Linux CI image (Docker `oven/bun:1`).

A test message `feat: bootstrap` should pass `bunx commitlint`; `Bootstrap` should fail. A staged file with trailing whitespace should be fixed by `bun run format` / lint-staged on commit. Branch `feat-bootstrap` passes pre-push; `feat_bootstrap` fails.
