# Releasing symbiot

symbiot ships **five agent integrations** under one repo-wide version. Every
integration is installable without cloning the repo:

- **Claude Code** — a standalone per-platform binary via the Claude Code
  marketplace. The plugin tree stays small (a POSIX shim, a Windows batch shim, a
  SHA256SUMS manifest, and a VERSION pointer); the binaries live in GitHub
  Releases, and the shim downloads the right one on first invocation, verifies its
  hash, caches it under `${CLAUDE_PLUGIN_DATA}/bin/`, and execs it.
- **Codex, Gemini, Copilot** — a per-agent compiled binary (`symbiot-<agent>-<triple>`)
  published as a GitHub Release asset. `scripts/install.sh` (macOS/Linux) /
  `scripts/install.ps1` (Windows) download + SHA256-verify it, install it to
  `~/.local/bin/symbiot-<agent>`, and run its `install-hook` to wire the host.
- **OpenCode** — the `@symbiot/opencode-plugin` npm package (in-process plugin;
  cannot be a binary), loaded from `~/.config/opencode/plugins/`.

`bun --filter @symbiot/<agent> install-hook` from a clone is still the
contributor dev path (it points the hook at source `cli.ts`); the compiled binary
emits the bare `symbiot-<agent> run-hook` instead (resolved via `resolveHookCommand`).

This document is the source of truth for cutting and rolling back a
release.

## When to release

- Any user-visible change in any `apps/*` integration (`claude-code`, `codex`,
  `gemini`, `copilot`, `opencode-plugin`) or in `apps/viewer` that lands in what
  users run.
- A change in the shared `@symbiot/agent-runtime` that affects integration
  behaviour.
- A bug fix in `apps/claude-code/bin/symbiot` or `symbiot.cmd`.
- A dependency upgrade in `@symbiot/viewer` or `@symbiot/editor` that
  affects rendered output.

Internal refactors that produce a byte-identical binary do not need a
release.

## Versioning

Tags follow `vMAJOR.MINOR.PATCH` (semver). symbiot uses a **single repo-wide
version**: one tag bumps every integration in lockstep. The release workflow's
auto-PR (step ⑧) is the only thing that bumps versions — never edit them by hand
on `main`. The `version` string is written **without** the `v` prefix into every
version-bearing manifest:

- `apps/claude-code/.claude-plugin/plugin.json` (plus `bin/VERSION` and `bin/SHA256SUMS`)
- `apps/gemini/extension/gemini-extension.json`
- `apps/*/package.json` for every integration plus `apps/viewer`

`codex`, `copilot`, and `gemini` carry no version inside their distributed
artifact (the binary embeds the build-time version like claude-code); their
`package.json` `version` is kept in lockstep for consistency. The
`@symbiot/opencode-plugin` npm package is published with the tag version (the
`npm-publish` job sets it from `GITHUB_REF_NAME` before publishing). Note that
`.claude-plugin/marketplace.json` is intentionally **Claude-Code-only**: the
other hosts load symbiot through their own config (Codex/Copilot hooks, the
Gemini extension, the OpenCode plugin loader), not this marketplace.

## Distribution channels

| Integration              | Channel                                            | Install                                                        |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------- |
| claude-code              | Claude Code marketplace (shim + downloaded binary) | `/plugin marketplace add awinogradov/symbiot`                  |
| codex / copilot / gemini | per-agent binary on GitHub Releases                | `curl -fsSL …/scripts/install.sh \| bash -s -- --agent <name>` |
| opencode                 | `@symbiot/opencode-plugin` on npm                  | see `apps/opencode-plugin/README.md`                           |

`scripts/install.sh` / `install.ps1` resolve the platform triple, download
`symbiot-<agent>-<triple>` for the latest (or `--version`) release, verify it
against the release `SHA256SUMS`, install to `~/.local/bin` (`%LOCALAPPDATA%\symbiot`
on Windows), and run the binary's `install-hook`. Gemini additionally ships
`apps/gemini/extension/` for `gemini extensions install` once the binary is on PATH.

**Build & publish (CI).** `release.yml`'s matrix compiles claude-code + codex +
gemini + copilot for each triple (`bun run compile:<triple>` per app), uploads
them, computes a combined `SHA256SUMS`, and attaches everything to the release.
A separate `npm-publish` job builds and publishes `@symbiot/opencode-plugin`
(provenance on; dry-run when `NPM_TOKEN` is unset). Cross-platform binaries and
the npm publish are exercised only on the release tag — they cannot be verified
on a feature branch.

> Copilot has no first-class plugin-marketplace manifest in this repo: its hooks
> live in `~/.copilot/hooks/`, which the installer's `install-hook` writes
> directly, so a marketplace manifest would add nothing.

## Release pipeline

```
╭───────────────────╮
│  git tag v0.2.0   │
│  git push --tags  │
╰─────────┬─────────╯
          │ triggers .github/workflows/release.yml
          ▼
╭──────────────────────────────────────────────────────────────────╮
│                       Matrix Build Job                           │
├──────────────────────────────────────────────────────────────────┤
│ macos-14    │ macos-14    │ ubuntu-latest │ windows-latest       │
│ darwin-arm64│ darwin-x64  │ linux-x64     │ windows-x64          │
│      │             │             │              │                │
│      ▼             ▼             ▼              ▼                │
│  ① bun install --frozen-lockfile                                 │
│  ② bun --filter @symbiot/viewer build                            │
│     (vite-plugin-singlefile → index.html → gzip -9)              │
│  ③ bun run compile:<triple>  (bun build --compile)               │
│  ④ upload artifact `symbiot-<triple>` (~60 MB)                   │
╰────────────────────────────┬─────────────────────────────────────╯
                             │
                             ▼
╭──────────────────────────────────────────────────────────────────╮
│                     Aggregation Job (Linux)                      │
├──────────────────────────────────────────────────────────────────┤
│  ⑤ download all 4 artifacts                                      │
│  ⑥ shasum -a 256 symbiot-* > SHA256SUMS                          │
│  ⑦ gh release create v0.2.0 --generate-notes                     │
│       symbiot-darwin-arm64  symbiot-darwin-x64                   │
│       symbiot-linux-x64     symbiot-windows-x64.exe              │
│       SHA256SUMS                                                 │
│  ⑧ gh pr create release-bump-v0.2.0  →  bumps                    │
│       apps/claude-code/bin/{VERSION,SHA256SUMS}                  │
│       apps/claude-code/.claude-plugin/plugin.json                │
│       apps/gemini/extension/gemini-extension.json                │
│       apps/*/package.json - all integrations + viewer            │
╰────────────────────────────┬─────────────────────────────────────╯
                             │
        ┏━━━━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━┓
        ┃   Maintainer reviews + merges the PR    ┃
        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                             │
                             ▼
   Users on next `/plugin update symbiot` pull the new SHA256SUMS;
   the shim sees a hash mismatch on the cached binary and downloads
   the new release asset. No action required on the user side.
```

> The diagram traces the claude-code path. Each matrix runner now also compiles
> `symbiot-{codex,gemini,copilot}-<triple>` (steps ③/④), and a sibling
> `npm-publish` job ships `@symbiot/opencode-plugin` — see **Distribution channels** above.

**Flow Legend:**

- ① / ② Each runner installs deps and produces the single-file viewer
- ③ `bun build src/cli.ts --compile --target=bun-<triple> --bytecode --minify`
- ④ Per-platform artifact uploaded with `actions/upload-artifact@v4`
- ⑤ / ⑥ Aggregation downloads all four and computes the canonical hashes
- ⑦ New GitHub Release with auto-generated notes + 4 binaries + SHA256SUMS
- ⑧ PR opened against `main` that brings every in-repo manifest into sync

Each binary embeds the release's `plugin.json` version and the build commit's
SHA at compile time (`apps/viewer/buildInfo.ts` → Vite `define`). The viewer
surfaces both via its bottom-right debug bar; bug reports should include the
SHA shown there.

## Shim ↔ binary contract

```
${CLAUDE_PLUGIN_ROOT}                       ${CLAUDE_PLUGIN_DATA}
(immutable, ships with plugin)              (writable cache, per user)
┌──────────────────────────────┐            ┌──────────────────────────────┐
│ bin/                         │            │ bin/                         │
│   symbiot           (POSIX)  │            │   symbiot-darwin-arm64       │
│   symbiot.cmd       (Win32)  │            │   symbiot-darwin-x64         │
│   VERSION           v0.2.0   │            │   symbiot-linux-x64          │
│   SHA256SUMS                 │            │   symbiot-windows-x64.exe    │
└──────────────┬───────────────┘            │   .download.lock/  (lock dir)│
               │                            └──────────────────────────────┘
               │
               │  ① hooks.json invokes "${CLAUDE_PLUGIN_ROOT}/bin/symbiot"
               │     under three sub-commands:
               │       prepare   (SessionStart)
               │       run-hook  (PreToolUse / PermissionRequest)
               │       <other>   (manual CLI)
               ▼
        ╔═══════════════════════════════════════════════════════╗
        ║                   shim logic                          ║
        ╠═══════════════════════════════════════════════════════╣
        ║  ② resolve $TRIPLE from uname -s / uname -m           ║
        ║  ③ shasum -a 256 ${CLAUDE_PLUGIN_DATA}/bin/           ║
        ║                       symbiot-$TRIPLE                 ║
        ║     compare to expected hash from SHA256SUMS          ║
        ╚════════════════════════════╤══════════════════════════╝
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
            match                                  mismatch / missing
        ④ exec the cached binary                ⑤ mkdir-lock download:
            (or exit 0 for `prepare`)              curl -fsSL  \\
                                                     https://github.com/  \\
                                                       awinogradov/symbiot/ \\
                                                       releases/download/   \\
                                                       $VERSION/symbiot-$TRIPLE
                                                ⑥ shasum -a 256 — verify
                                                ⑦ chmod +x; atomic mv
                                                ⑧ exec
```

**Flow Legend:**

- ① Three sub-commands share one entry point so the shim coordinates
  cache state across SessionStart and the per-tool hooks
- ② / ③ Hash check is the single source of truth for "is this the
  binary the plugin's current `SHA256SUMS` expects"
- ④ Fast path: every invocation after the first is a single `exec`
- ⑤ Slow path is guarded by a **portable `mkdir` lock** on
  `.download.lock` (atomic on macOS + Linux, unlike `flock`, which is not
  shipped on macOS, so the old guard never actually locked there). The
  lock winner downloads; a racing
  invocation (e.g. `run-hook` while `prepare` is still fetching) **waits**
  on the same download and then exec's the freshly cached binary instead
  of starting its own. A holder that dies is detected via its PID
  (`kill -0`) and the lock is stolen
- ⑥ Hash mismatch on the downloaded artifact aborts the install
- ⑦ Download lands in a PID-unique temp; atomic rename means the shim
  never exec's a half-written file even if two downloads overlap
- ⑧ All args from the original shim invocation are forwarded

## Step-by-step checklist

1. **Drain main** of unreleased commits — make sure the tag will include
   everything you expect.
2. **Pick the version** per semver. Patch for fixes, minor for new
   surface, major for breaking changes (rare while pre-1.0).
3. **Tag and push**:

   ```
   git tag v0.X.Y
   git push origin v0.X.Y
   ```

   This is the trigger for `.github/workflows/release.yml`.

4. **Watch the workflow.** All four matrix jobs must succeed before the
   aggregation job opens the bump PR. If any platform fails:

   ```
   gh release delete v0.X.Y --yes --cleanup-tag
   ```

   Fix the failing build on `main`, then re-tag.

5. **Merge the auto-PR** `release-bump-v0.X.Y` after a normal review.
   The PR is what users see in their next `/plugin update`.
6. **Smoke test** in a scratch project:

   ```
   /plugin marketplace update symbiot
   /plugin update symbiot
   ```

   Then enter plan mode in any agent session and confirm:
   - the new binary appears under `~/.claude/plugin-data/symbiot/bin/`
     (or wherever Claude Code resolves `${CLAUDE_PLUGIN_DATA}` on
     your platform);
   - the viewer renders;
   - Approve / Request-changes both round-trip.

## Rollback

1. **Delete the bad release** (preserves the git tag):

   ```
   gh release delete v0.X.Y --yes
   ```

   Or delete the tag too with `--cleanup-tag` if you intend to re-cut
   the same number.

2. **Revert the bump PR on `main`**. Once merged, the in-repo
   `SHA256SUMS` and `VERSION` point at the prior good release; the
   shim's hash check fires on every user's next session and pulls the
   prior binary down to replace the cached bad one.

3. **Communicate.** Drop a note in the release's GitHub Discussion
   pinning the rollback so anyone investigating future tags can find
   the trail.

## Air-gapped installs

The shim's only network call is the `curl` to GitHub Releases. Operators
in air-gapped environments can pre-stage the binary:

```
mkdir -p $CLAUDE_PLUGIN_DATA/bin
cp /path/to/symbiot-linux-x64 $CLAUDE_PLUGIN_DATA/bin/symbiot-linux-x64
chmod +x $CLAUDE_PLUGIN_DATA/bin/symbiot-linux-x64
```

The shim's first cache-hit check will succeed and skip the download.
The pre-staged binary's SHA256 still has to match `SHA256SUMS` shipped
with the installed plugin version.
