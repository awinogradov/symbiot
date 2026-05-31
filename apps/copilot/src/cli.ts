#!/usr/bin/env bun
/**
 * `symbiot-copilot` CLI entrypoint. Dispatches via the shared {@link createCli} to:
 *  - `install-hook`   — register the `agentStop` hook in ~/.copilot/hooks/symbiot-copilot.json
 *  - `uninstall-hook` — remove symbiot's hook file from ~/.copilot/hooks/
 *  - `run-hook`       — handler Copilot invokes on `agentStop` (reads stdin); accepts
 *                       optional `--port` / `--no-open`
 *  - `annotate <file>`— launch the viewer in annotate mode against a markdown file
 *
 * Exit codes: 0 on success, 1 on unhandled error, 64 on usage error.
 */
import { createCli } from "@symbiot/agent-runtime/cli";

import { installHook, uninstallHook } from "./installHook.ts";
import { runAnnotate } from "./runAnnotate.ts";
import { runHook } from "./runHook.ts";

createCli({
  binName: "symbiot-copilot",
  usageCommands: "<install-hook|uninstall-hook|run-hook|annotate <file.md>>",
  handlers: {
    "install-hook": async () => {
      const { path, command } = await installHook();
      process.stdout.write(
        `installed symbiot-copilot agentStop hook in ${path}\n  command: ${command}\n`
      );
      return 0;
    },
    "uninstall-hook": async () => {
      const { path, removed } = await uninstallHook();
      process.stdout.write(
        removed === 0
          ? `no symbiot-copilot hook found in ${path}\n`
          : `removed symbiot-copilot hook from ${path}\n`
      );
      return 0;
    },
    "run-hook": (argv) => runHook(argv),
    annotate: (argv) => runAnnotate(argv[0]),
  },
}).run(process.argv.slice(2));
