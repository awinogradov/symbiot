# Phase 9 — Wide agent integrations

## Goal

Extend the single-agent (Claude Code) MVP into a broader set of AI coding agents. Each integration is independent and additive; they all share the same `apps/viewer` HTTP contract proven in Phase 2.

## Sequence (user-confirmed priority)

1. **OpenCode plugin** (`apps/opencode-plugin`) — validates that the server contract is agent-agnostic.
2. **Codex CLI** (`apps/codex`).
3. **Copilot CLI** (`apps/copilot`).
4. **Pi extension** (`apps/pi-extension`), **Gemini** (`apps/gemini`), and any other long-tail agents.

For each agent that has an existing plannotator integration, the symbiot server's plan-mode contract is wire-compatible, so the integration shape (plan-finish event → spawn → open browser → resolve) carries across cleanly.

## Exit criteria (per agent)

- [ ] Plan-finish event triggers the symbiot server.
- [ ] Browser opens with the plan rendered.
- [ ] Approve and Request-changes round-trip back to the agent.
- [ ] Annotate mode works (where the agent supports invoking a markdown file annotation pass).
- [ ] An example flow doc is added to the package README.

## Per-agent task template

For each agent integration:

1. **Read the agent's hook / extension surface:**
   - Plan-finish event detection mechanism.
   - How feedback is routed back to the agent.
   - Any agent-specific config files or env vars.
2. **Build the integration:**
   - Spawn `apps/viewer` (the fullstack binary) with the right mode and storage path under `~/.symbiot/`.
   - Open the browser to the served port.
   - Block on resolve, return the decision to the agent.
3. **Smoke test** with the real agent.
4. **Add an example flow doc** to the package README.

## Out of scope

- `apps/review` (code-review mode) — **never**. NG2 from the PRD.
- `apps/skills`, `apps/vscode-extension` — defer to backlog; not in this plan.
- Improvement hooks (per-agent post-plan hook chain) — defer to backlog.
- Archive mode (CLI subcommand for historical plans) — defer to backlog.

## Tasks

For OpenCode (first integration):

1. Read OpenCode's plugin/hook documentation. Identify the plan-finish event mechanism.
2. Implement `apps/opencode-plugin/` against that mechanism.
3. Use `~/.symbiot/` for all storage; CLI command `symbiot`.
4. `package.json` name `@symbiot/opencode-plugin`; depends on `@symbiot/viewer` (imports `startServer`) and the shared spawn helper extracted from `apps/hook`.
5. Smoke test: install in a real OpenCode environment; trigger a plan-finish; verify the symbiot UI opens.

For Codex / Copilot / Pi / Gemini: repeat the template per agent. Each agent gets its own PR.

## Dependencies

Per-agent. None at the monorepo level beyond what already exists.

## Risks / OQs

- **Server contract drift.** As more agents wire up, the `apps/viewer` HTTP API contract must stay stable. The golden-file CI workflow from Phase 8 catches feedback-markdown drift; need a similar check for endpoint signatures (consider TypeScript declaration tests).
- **Agent-specific quirks** (e.g. Codex's stdout protocol, Copilot's hook discovery). Audit each agent's plugin API before implementation.

## Verification

For each agent:

- **Manual smoke test** with the real running agent — Approve cycle works end-to-end. Optionally annotate a markdown file via that agent's path.
- **Fallback for agents the planner can't run:** a fixture test that POSTs a mocked plan to the server using the agent's contract and asserts the round trip.

## Cross-phase gate

After this phase: every supported agent integration ships against the symbiot server.
