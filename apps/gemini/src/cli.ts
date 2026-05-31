#!/usr/bin/env bun
/**
 * `symbiot-gemini` CLI entrypoint. Dispatches via the shared {@link createCli} to:
 *  - `install-hook`   — register the `AfterAgent` hook in ~/.gemini/settings.json
 *  - `uninstall-hook` — remove every symbiot-gemini entry from ~/.gemini/settings.json
 *  - `run-hook`       — handler Gemini invokes on `AfterAgent` (reads stdin); accepts
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
  binName: "symbiot-gemini",
  usageCommands: "<install-hook|uninstall-hook|run-hook|annotate <file.md>>",
  handlers: {
    "install-hook": async () => {
      const { path, command } = await installHook();
      process.stdout.write(
        `installed symbiot-gemini AfterAgent hook in ${path}\n  command: ${command}\n`
      );
      return 0;
    },
    "uninstall-hook": async () => {
      const { path, removed } = await uninstallHook();
      process.stdout.write(
        removed === 0
          ? `no symbiot-gemini hook found in ${path}\n`
          : `removed ${removed} symbiot-gemini hook entr${removed === 1 ? "y" : "ies"} from ${path}\n`
      );
      return 0;
    },
    "run-hook": (argv) => runHook(argv),
    annotate: (argv) => runAnnotate(argv[0]),
  },
}).run(process.argv.slice(2));
