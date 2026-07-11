# @symbiot/claude-code

Claude Code plugin that intercepts plan-mode plans, forwards them to the
embedded symbiot viewer for annotation, and returns the resolved markdown
back to Claude Code.

## Architecture

```
Claude Code
  │ PreToolUse(ExitPlanMode)
  ▼
hooks/hooks.json  ──exec──▶  bin/symbiot (shim)
                                │
                                │ downloads + verifies SHA256
                                ▼
                             ${CLAUDE_PLUGIN_DATA}/bin/symbiot-<platform>
                                │ runHook / runAnnotate
                                ▼
                             @symbiot/agent-runtime  runPlanReview()
                                │ spawns the embedded viewer
                                ▼
                              apps/viewer  (HTTP server + UI)
                                │ user reviews, annotates, decides
                                ▼
                           feedback markdown → stdout → Claude Code
```

This directory doubles as the **plugin root** (`${CLAUDE_PLUGIN_ROOT}`):

- `.claude-plugin/plugin.json` — plugin manifest (name, version, repo).
- `hooks/hooks.json` — registers `SessionStart`, `PreToolUse(ExitPlanMode)`, and `PermissionRequest(ExitPlanMode)`, each invoking `${CLAUDE_PLUGIN_ROOT}/bin/symbiot`.
- `bin/symbiot` — POSIX shell shim that downloads and execs the platform-specific binary from GitHub Releases.
- `bin/symbiot.cmd` — Windows counterpart.
- `bin/VERSION`, `bin/SHA256SUMS` — the version + hash manifest the shim verifies downloads against.

## Hook lifecycle & timeouts

```text
┌───────────────┐                     ┌────────────────────────────┐
│ SessionStart  │                     │ ExitPlanMode               │
└───────┬───────┘                     └──────────────┬─────────────┘
        │ ①                                          │ ③
        ▼                                            ▼
┌────────────────────────┐           ┌────────────────────────────┐
│ symbiot prepare        │           │ symbiot run-hook           │
│ timeout 120s           │           │ timeout 3600s (1 hour)     │
│ download-only · exit 0 │           │ spawn viewer · BLOCK       │
└───────┬────────────────┘           └──────────────┬─────────────┘
        │ ②                                          │ ④
        ▼                                            ▼
┌─────────────────────────────┐      ┌────────────────────────────┐
│ ${DATA}/bin/symbiot-<triple> │◀─warm│ binary present?            │
│ (sha-verified cache)         │      └──────────────┬─────────────┘
└─────────────────────────────┘                     │ ⑤
                                                     ▼
                                     ┌────────────────────────────┐
                                     │ reviewer reads & decides   │
                                     │ approve / request changes  │
                                     └────────────────────────────┘
```

**Flow Legend:**

- ① `SessionStart` pre-warms the cache before any tool runs.
- ② `prepare` downloads the ~60 MB binary (≤120 s budget) and exits 0 — it never blocks on a human.
- ③ `ExitPlanMode` fires `run-hook` to open the plan-review viewer.
- ④ A warm cache execs instantly; a cold cache absorbs a ~44 s download first.
- ⑤ `run-hook` **blocks until the reviewer decides** — open-ended human time, so its hook entry carries a **1-hour** `timeout` (`3600`). The default command-hook timeout (600 s) would kill a slow review or a cold download; `prepare` keeps the shorter 120 s budget because it only downloads.

Every entry also carries a `statusMessage` — Claude Code renders it as a spinner label while the hook runs, so a cold-cache download (which is otherwise silent — command hooks have no controlling terminal) shows "Symbiot: preparing plan reviewer (first run downloads the viewer)…" instead of looking frozen.

## Installation

```
/plugin marketplace add awinogradov/symbiot
/plugin install symbiot
```

No Bun, no Node, no other runtime needed on the user side. On the first
session after install the shim downloads a ~60 MB binary for the
current platform into `${CLAUDE_PLUGIN_DATA}/bin/` and verifies its
SHA256 against `bin/SHA256SUMS`. This cold download takes ~44 s on a
normal connection; `SessionStart` pre-warms it so the first
`ExitPlanMode` is usually instant. If a cold download does land on a
`run-hook` invocation, the 1-hour hook timeout lets it finish rather
than being killed silently.

> **Mid-session updates:** `/reload-plugins` swaps in a new plugin
> version **without re-firing `SessionStart`**, so the new binary is not
> pre-warmed until the next session. The first `ExitPlanMode` after such
> an update may incur a cold (but now survivable) download. Concurrent
> `prepare` + `run-hook` downloads coordinate through a portable `mkdir`
> lock — the second waits on the first instead of racing it.

See [`docs/09-release.md`](../../docs/09-release.md) for the release flow and
the offline-install path.

## Usage

Once installed, the hook is automatic — exit plan mode in Claude Code and
the viewer opens in your browser. Approve to continue, or Request changes
to send markdown feedback back to the agent.

The CLI can also be invoked directly to annotate any markdown file outside
the plan-mode flow:

```sh
bin/symbiot annotate path/to/document.md
```

### Draft mode (`/draft` skill · `symbiot draft`)

The inverse, human-initiated flow (UC5): you write the plan, the agent
refines it. In Claude Code, invoke the plugin's `/draft` skill — optionally
with a markdown file to seed from (`/draft notes/plan.md`) — and the viewer
opens with an **editable** document. "Send to agent" hands your revision to
the agent, which refines it and re-opens the viewer leading with the inline
diff; "Approve" ends the loop and the agent implements the agreed plan.

The CLI form:

```sh
bin/symbiot draft                        # blank draft
bin/symbiot draft path/to/seed.md        # seeded draft
bin/symbiot draft refined.md --slug s    # agent re-run: same version history
```

The blocking command reports its outcome as a single marker line on stdout
(`SYMBIOT_DRAFT_REVISION <path>` / `SYMBIOT_DRAFT_APPROVED <path>` /
`SYMBIOT_DRAFT_CANCELLED`). The normative marker and exit-code contract lives
in [`docs/03-server-contract.md` § Draft loop contract](../../docs/03-server-contract.md#draft-loop-contract).

## Local development

For contributors iterating on the source tree (no need to compile a
binary on every change), the legacy installer still works:

```sh
bun run hook:install     # registers settings.json hooks pointing at src/cli.ts
bun run hook:uninstall   # removes them
```

This path requires `bun` on your PATH and runs the TypeScript source
directly via `bun src/cli.ts run-hook`.

### Build a binary locally

```sh
bun run compile:darwin-arm64   # or :darwin-x64 / :linux-x64 / :windows-x64
bun run compile:all            # all 4 platforms (CI does this on tag push)
```

The viewer must be built first (Turborepo handles this via
`dependsOn: ["^build"]`):

```sh
bun --filter @symbiot/viewer build
```

### Scripts

- `bun run build` — non-compiled JS bundle of the CLI (dev convenience).
- `bun run compile:<triple>` — single-file binary for one platform.
- `bun run compile:all` — all 4 supported platforms.
- `bun run typecheck` — `tsc --noEmit`.
- `bun run lint` — `eslint . --max-warnings=0`.
- `bun run test` — `vitest run --passWithNoTests`.

## Documentation

- [`docs/09-release.md`](../../docs/09-release.md) — release pipeline, shim/binary contract.
- [`docs/03-server-contract.md`](../../docs/03-server-contract.md) — HTTP surface the hook talks to.
- [`docs/02-architecture.md`](../../docs/02-architecture.md) — composition across apps and packages.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
