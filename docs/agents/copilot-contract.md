# GitHub Copilot CLI hook contract (audit)

The Step 0 contract audit for [`apps/copilot`](../../apps/copilot/README.md) (issue #67).
It locks the GitHub **Copilot CLI** hook stdin → stdout contract that
`symbiot-copilot run-hook` depends on, and records the evidence so a future
maintainer can re-verify each claim against pinned upstream source.

> **Verdict — block-until-approve is VIABLE** via the `agentStop` hook. See
> [Verdict](#verdict) for the full reasoning, including loop-safety and the one
> `pending-live-confirmation` gap (the transcript file format).

## Two surfaces — pick the right one

Copilot exposes hooks through **two distinct surfaces** with overlapping but
**not identical** event sets. The issue's term "`@github/copilot-cli-extensions`
SDK" conflates them; the audit separates them:

| Surface                                    | What it is                                                                                                          | Has a turn-end blocking event?                                                                                                                                                        | In scope?                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **CLI command hooks**                      | Config files at `~/.copilot/hooks/*.json`; each event runs an external command, JSON on stdin → JSON on stdout.     | **Yes — `agentStop`.**                                                                                                                                                                | **In scope.** This is what `install-hook`/`run-hook` drive.                                   |
| **Extensions SDK** (`@github/copilot-sdk`) | A programmatic JSON-RPC SDK; you register `onPreToolUse`/`onSessionEnd`/… callbacks in a long-running host process. | **No.** Its lifecycle hooks are `onSessionStart`/`onSessionEnd` only — `onSessionEnd` output is `{suppressOutput, cleanupActions, sessionSummary}`, with **no decision/retry field**. | **Out of scope** (issue: "Slash-command / custom-agent integration with the Extensions SDK"). |

Notes:

- `@github/copilot-cli-extensions` **does not exist on npm** (404). The published
  CLI is `@github/copilot` (`1.0.56` at audit time). The programmatic SDK is
  `@github/copilot-sdk` (repo `github/copilot-sdk`). `github/copilot-cli` is a
  distribution stub (`install.sh`, `README.md`, `changelog.md`) — not source.
- The CLI command-hook surface is the **only** one that fires a blockable
  turn-end event (`agentStop`). The SDK programmatic surface has no `agentStop`
  and its `onSessionEnd` cannot block — so an SDK-based integration could not
  implement block-until-approve. This is the single most important reason the
  integration is a CLI command hook, not an SDK extension.

## Configuration (in-scope surface)

CLI hooks load from `~/.copilot/hooks/*.json` (user; `$COPILOT_HOME/hooks/` if
set), `.github/hooks/*.json` (repo), and inline `settings.json` blocks. Files use
`version: 1` with a `hooks` map keyed by event name. `symbiot-copilot` owns a
dedicated `~/.copilot/hooks/symbiot-copilot.json`:

```jsonc
{
  "version": 1,
  "hooks": {
    "agentStop": [
      {
        "type": "command",
        "command": "bun /abs/path/apps/copilot/src/cli.ts run-hook",
        "timeoutSec": 3600,
        "_managedBy": "symbiot-copilot",
      },
    ],
  },
}
```

- `timeoutSec` is in **seconds**, default **30** (`timeout` is an alias). A human
  review needs far longer, so we write `3600` — like Codex's seconds, **unlike**
  Gemini's milliseconds.
- `command` is the cross-platform field (copied to `bash`+`powershell`). Points at
  source `cli.ts` (never a bundle) so the embedded viewer's relative
  `dist/client/` path math holds — the same rule as the other agents.
- `_managedBy` is a symbiot ownership sentinel (not part of Copilot's schema; it
  rides along ignored) so `uninstall-hook` only removes entries it owns.

## `agentStop` contract (the gated event)

`agentStop` fires when **the main agent finishes a turn** and **can block and
force continuation**. The payload comes in two formats, selected by the
configured event name (`agentStop` → camelCase; `Stop` → VSCode/Claude-compatible
snake_case). symbiot registers under **`agentStop`** and reads the camelCase form:

```typescript
// stdin (camelCase — event name "agentStop")
{ sessionId: string; timestamp: number; cwd: string; transcriptPath: string; stopReason: "end_turn" }

// stdout decision (write to approve-block; omit to approve)
{ decision: "block" | "allow"; reason?: string }   // "block" forces another turn using `reason` as the prompt
```

- **No inline assistant message.** The turn's output is reachable only via
  `transcriptPath` — `run-hook` reads that file and extracts the last assistant
  message. (Codex's `Stop` carries `last_assistant_message` and Gemini's
  `AfterAgent` carries `prompt_response` inline; Copilot does not.)
- **No `stop_hook_active` re-entrancy field.** Codex/Gemini rely on that field to
  avoid a block→retry→block loop; Copilot's payload has none, so `run-hook`
  self-manages re-entrancy with a session-scoped marker (see
  `apps/copilot/src/runHook.ts`).
- The decision shape `{decision:"block",reason}` is **byte-identical** to what
  `apps/claude-code`, `apps/codex`, and `apps/gemini` already emit — the
  agent-agnostic contract holds.

## Why not `preToolUse`

`preToolUse` can block (`{permissionDecision:"deny",permissionDecisionReason}`)
and carries its `toolArgs` **inline** (no transcript needed), so it would be the
cleaner mechanism **if** Copilot exposed a plan-presentation tool to gate on (the
`apps/claude-code` `PreToolUse(ExitPlanMode)` model). It does not: the documented
hookable tool names are `ask_user, bash, create, edit, glob, grep, powershell,
task, view, web_fetch` — **no plan/`ExitPlanMode`-equivalent tool**. Copilot's
"plan mode" is a session mode, not a hookable tool call. So `preToolUse` cannot
target "the agent presented its plan", and `agentStop` (turn end) is the correct
and only fit. `preToolUse` is documented here for completeness but is **not**
wired by the integration.

## Claim → Evidence

Pinned at audit time (2026-05-31). Re-verify against these refs:

- **D** = `github/docs` `content/copilot/reference/hooks-reference.md` @ `86bc2ea1fbe8ab7980af235ec9679950342fe810`
- **S** = `github/copilot-sdk` @ `4d2df4c96aa6d42df38dd6e9ac7bd27e7f178c26`
- **N** = npm registry (observed `npm view`)

| #   | Claim                                                                                                                                                       | Source | Locator                                                                                                                        | Verified                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1   | CLI hooks load from `~/.copilot/hooks/*.json` (user); `$COPILOT_HOME/hooks/` override                                                                       | D      | `hooks-reference.md` §Hooks locations, L36                                                                                     | ✅                           |
| 2   | Config is `version:1`; command hooks take `command`/`bash`/`powershell`, `cwd`, `env`, `timeoutSec`                                                         | D      | §Command hooks, L63–97                                                                                                         | ✅                           |
| 3   | `timeoutSec` is seconds, default `30`; `timeout` is an alias                                                                                                | D      | §Command hooks field table, L92–96                                                                                             | ✅                           |
| 4   | `agentStop` "fires when the main agent finishes a turn" and "can block and force continuation"                                                              | D      | §Hook events table, L168                                                                                                       | ✅                           |
| 5   | `agentStop` stdin = `{sessionId,timestamp,cwd,transcriptPath,stopReason:"end_turn"}` (camelCase); no inline message                                         | D      | §`agentStop`/`Stop` payload, L359–383                                                                                          | ✅                           |
| 6   | `agentStop` decision = `{decision:"block"\|"allow",reason}`; `"block"` forces another turn using `reason`                                                   | D      | §`agentStop`/`subagentStop` decision control, L512–517                                                                         | ✅                           |
| 7   | No `stop_hook_active` (or equivalent) field in the `agentStop` payload                                                                                      | D      | §`agentStop` payload, L359–383 (field set is exhaustive)                                                                       | ✅                           |
| 8   | Timeouts and non-`2` non-zero exits are "logged and skipped — they never block agent execution" (fail-open; timeout ⇒ proceed)                              | D      | §Tool names…/Exit codes, L635, L637–643                                                                                        | ✅                           |
| 9   | No plan/`ExitPlanMode` tool exists to gate `preToolUse` on                                                                                                  | D      | §Tool names for hook matching, L620–633                                                                                        | ✅                           |
| 10  | `preToolUse` decision = `{permissionDecision:"allow"\|"deny"\|"ask",permissionDecisionReason,modifiedArgs}`                                                 | D      | §`preToolUse` decision control, L502–510                                                                                       | ✅                           |
| 11  | The SDK programmatic surface has no `agentStop`; lifecycle hooks are `onSessionStart`/`onSessionEnd`, and `onSessionEnd` output has no decision/retry field | S      | `docs/hooks/session-lifecycle.md` §Session end → Output; `java/src/main/java/com/github/copilot/rpc/SessionEndHookOutput.java` | ✅                           |
| 12  | `@github/copilot-cli-extensions` is not published; `@github/copilot` is the CLI package                                                                     | N      | `npm view @github/copilot-cli-extensions` → 404; `npm view @github/copilot version` → `1.0.56`                                 | ✅                           |
| 13  | The transcript file **format** (the JSON/JSONL schema at `transcriptPath`) is not specified in public docs/SDK                                              | D, S   | absent from `hooks-reference.md` and `github/copilot-sdk` (only the `transcriptPath` _field_ is documented)                    | ⚠️ pending-live-confirmation |

## Verdict

**Block-until-approve via `agentStop`: VIABLE.**

- **Can it pause the agent until the reviewer decides?** Yes. `agentStop` runs a
  synchronous command hook; the agent waits for it to exit. `run-hook` blocks on
  the viewer (up to `timeoutSec: 3600`) and only then emits its decision
  (claims 1–6).
- **Can it send the reviewer's feedback back as a revision?** Yes.
  `{decision:"block",reason}` forces another turn with `reason` as the prompt —
  identical to Codex/Gemini (claim 6).
- **Is it loop-safe?** Not natively — there is no `stop_hook_active` field
  (claim 7). `run-hook` self-manages re-entrancy with a session-scoped marker
  (`~/.symbiot/hook-state/<sessionId>.json`, plan-hash + TTL) so a `block` and the
  retry turn it triggers do not re-gate infinitely.
- **Failure posture is safe.** Timeouts and crashes are logged and skipped by
  Copilot (claim 8), so a stuck/garbled hook never spuriously blocks — and
  `run-hook` itself fails open (no stdout, exit 0) on any error.

**One gap — the transcript format (claim 13).** `agentStop` provides only
`transcriptPath`, and the on-disk transcript schema is undocumented upstream and
could not be captured from a live CLI in this environment (no Copilot CLI
installed). `run-hook` parses it as **Claude/VSCode-compatible JSONL** — a
well-grounded inference, since every documented Copilot hook payload is explicitly
"VSCode Copilot extension compatible" — and **degrades to a pass-through** (no
block) if the shape is unexpected, so a wrong guess never blocks Copilot
incorrectly. This must be validated against a real `agentStop` run before the
extraction is considered confirmed; see `apps/copilot/README.md` → Known
limitations.

This gap does **not** make the integration degraded: the block/approve/feedback
round trip is fully source-verified and identical to the proven Codex/Gemini
path. Only the plan-text extraction carries a documented, fail-open inference.
