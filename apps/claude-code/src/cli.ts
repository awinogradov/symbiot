#!/usr/bin/env bun
/**
 * `symbiot` CLI entrypoint. Dispatches via the shared {@link createCli} to:
 *  - `install-hook`   — register the PreToolUse(ExitPlanMode) and
 *                       PermissionRequest(ExitPlanMode) hooks in ~/.claude/settings.json
 *  - `uninstall-hook` — remove every symbiot entry from ~/.claude/settings.json
 *  - `run-hook`       — handler invoked by Claude Code on ExitPlanMode (reads stdin)
 *  - `annotate <file>`— launch the viewer in annotate mode against a markdown file
 *  - `draft [file]`   — launch the viewer in the edit-first draft mode (blank or seeded)
 *
 * Exit codes: 0 on success, 1 on unhandled error, 64 on usage error.
 */
import { createCli } from "@symbiot/agent-runtime/cli";

import { installHook, uninstallHook } from "./installHook.ts";
import { runAnnotate } from "./runAnnotate.ts";
import { runDraft } from "./runDraft.ts";
import { runHook } from "./runHook.ts";

createCli({
  binName: "symbiot",
  usageCommands:
    "<install-hook|uninstall-hook|run-hook|annotate <file.md>|draft [file.md] [--slug <slug>]>",
  handlers: {
    "install-hook": async () => {
      const { path, command } = await installHook();
      process.stdout.write(
        `installed symbiot PreToolUse(ExitPlanMode) + PermissionRequest(ExitPlanMode) hooks in ${path}\n  command: ${command}\n`
      );
      return 0;
    },
    "uninstall-hook": async () => {
      const { path, removed } = await uninstallHook();
      process.stdout.write(
        removed === 0
          ? `no symbiot hook found in ${path}\n`
          : `removed ${removed} symbiot hook entr${removed === 1 ? "y" : "ies"} from ${path}\n`
      );
      return 0;
    },
    "run-hook": () => runHook(),
    annotate: (argv) => runAnnotate(argv[0]),
    draft: (argv) => runDraft(argv),
  },
}).run(process.argv.slice(2));
