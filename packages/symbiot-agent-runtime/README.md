# @symbiot/agent-runtime

Shared spawn-and-decide loop for agent integrations. It orchestrates the one
sequence every agent repeats to review a plan — spawn the viewer, hand the
reviewer a URL, block until they decide, tear the server down, and turn the
decision into a process exit code. Each agent supplies only what differs: how
it parses stdin and how it emits its own decision shape. `@symbiot/viewer`
(`startServer` / `RunningServer`) stays the boundary.

## Architecture

```
agent app (stdin parse)
    │  runPlanReview({ plan, mode?, onResolved })
    ▼
startServer() ──▶ RunningServer.url ──▶ onStart(url)   (agent's stderr line)
    │
    ▼
await server.resolved ──▶ Decision ──▶ server.stop()
    │
    ▼
onResolved(decision) ──▶ exit code    (agent emits its decision JSON)
```

`runPlanReview` owns the loop; `onResolved` is where the agent maps the
reviewer's decision (`approve` / `deny` / `feedback`) to an exit code and emits
its agent-specific output. `startServer` defaults to the real
`@symbiot/viewer` boundary and is injectable for tests.

## Installation

Workspace dependency — referenced as `"@symbiot/agent-runtime": "workspace:*"`
from other packages and apps.

## Usage

```ts
import { runPlanReview } from "@symbiot/agent-runtime";

const exitCode = await runPlanReview({
  plan,
  onStart: (url) => process.stderr.write(`symbiot: review plan at ${url}\n`),
  onResolved: (decision) => (decision.kind === "approve" ? 0 : 2),
});
process.exit(exitCode);
```

`mode`, `serverOptions`, and `onStart` are optional; `onResolved` is required —
its return value (sync or async) becomes the resolved exit code.

## Shared helpers

Beyond `runPlanReview`, this package owns the boilerplate that is identical across
agent apps, each on its own subpath import (no barrel — import the actual path):

| Import               | Exports                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `…/cli`              | `createCli` — dispatcher shell (usage/exit-64, error→exit-1)                                                                                                                         |
| `…/annotate`         | `runAnnotate` — the shared `annotate <file.md>` flow                                                                                                                                 |
| `…/draft`            | `runDraft` — the shared `draft [file.md] [--slug]` flow + `SYMBIOT_DRAFT_*` markers (contract: [`docs/03-server-contract.md`](../../docs/03-server-contract.md#draft-loop-contract)) |
| `…/hook-input`       | `readHookInput`, `flagValue`, `parsePort`, `createStopPlanExtractor`                                                                                                                 |
| `…/decision`         | `emitBlockDecision`, `emitDecision` — the `{"decision":"block",…}` contract                                                                                                          |
| `…/config-installer` | `createConfigHookInstaller` — merge a hook into a shared JSON settings file                                                                                                          |
| `…/managed-file`     | `writeAtomic`, `readOwnership`, `removeIfOwned` — atomic write + ownership sentinel                                                                                                  |
| `…/marker-store`     | `createMarkerStore` — TTL re-entrancy markers under `~/.symbiot/hook-state/`                                                                                                         |

An agent app supplies only its deltas (bin name, `agentId`, event/message field,
install target/timeout, embedded `viewerHtmlGz`). See
[`docs/10-add-agent-integration.md`](../../docs/10-add-agent-integration.md)
for the step-by-step.

## Local development

```sh
bun run typecheck
bun run lint
bun run test
```

## Documentation

- [`docs/02-architecture.md`](../../docs/02-architecture.md) — package layering and where this loop sits across agents.
- [`docs/03-server-contract.md`](../../docs/03-server-contract.md) — the viewer HTTP surface the loop drives.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
