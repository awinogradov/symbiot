# Releasing symbiot

The symbiot Claude Code plugin ships as a **standalone binary** per platform.
The plugin tree itself stays small: a POSIX shim, a Windows batch shim, a
SHA256SUMS manifest, and a VERSION pointer. The actual binaries live in
GitHub Releases — the shim downloads the right one on first invocation,
verifies its hash, caches it under `${CLAUDE_PLUGIN_DATA}/bin/`, and execs
it.

This document is the source of truth for cutting and rolling back a
release.

## When to release

- Any user-visible change in `apps/hook` or `apps/viewer` that lands in the
  binary.
- A bug fix in `apps/hook/bin/symbiot` or `symbiot.cmd`.
- A dependency upgrade in `@symbiot/viewer` or `@symbiot/editor` that
  affects rendered output.

Internal refactors that produce a byte-identical binary do not need a
release.

## Versioning

Tags follow `vMAJOR.MINOR.PATCH` (semver). `apps/hook/.claude-plugin/plugin.json`
`version` is the version string **without** the `v` prefix. Both are
bumped by the release workflow's auto-PR — never edit them by hand on
`main`.

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
│ macos-14    │ macos-13    │ ubuntu-latest │ windows-latest       │
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
│       apps/hook/bin/VERSION                                      │
│       apps/hook/bin/SHA256SUMS                                   │
│       apps/hook/.claude-plugin/plugin.json                       │
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

**Flow Legend:**

- ① / ② Each runner installs deps and produces the single-file viewer
- ③ `bun build src/cli.ts --compile --target=bun-<triple> --bytecode --minify`
- ④ Per-platform artifact uploaded with `actions/upload-artifact@v4`
- ⑤ / ⑥ Aggregation downloads all four and computes the canonical hashes
- ⑦ New GitHub Release with auto-generated notes + 4 binaries + SHA256SUMS
- ⑧ PR opened against `main` that brings the in-repo manifest into sync

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
└──────────────┬───────────────┘            │   .download.lock             │
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
        ④ exec the cached binary                ⑤ flock-guarded download:
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
- ⑤ Slow path is guarded by `flock` on `.download.lock` so concurrent
  SessionStart + PreToolUse never race
- ⑥ Hash mismatch on the downloaded artifact aborts the install
- ⑦ Atomic rename means the shim never exec's a half-written file
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
