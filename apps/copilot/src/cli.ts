#!/usr/bin/env bun
/**
 * `symbiot-copilot` CLI entrypoint. Dispatches to:
 *  - `install-hook`   — register the `agentStop` hook in ~/.copilot/hooks/symbiot-copilot.json
 *  - `uninstall-hook` — remove symbiot's hook file from ~/.copilot/hooks/
 *  - `run-hook`       — handler Copilot invokes on `agentStop` (reads stdin); accepts
 *                       optional `--port` / `--no-open`
 *  - `annotate <file>`— launch the viewer in annotate mode against a markdown file
 *
 * Exit codes: 0 on success, 1 on unhandled error, 64 on usage error.
 */
import { installHook, uninstallHook } from "./installHook.ts";
import { runAnnotate } from "./runAnnotate.ts";
import { runHook } from "./runHook.ts";

const usage = (): never => {
  process.stderr.write(
    "usage: symbiot-copilot <install-hook|uninstall-hook|run-hook|annotate <file.md>>\n"
  );
  process.exit(64);
};

const runInstall = async (): Promise<number> => {
  const result = await installHook();
  process.stdout.write(
    `installed symbiot-copilot agentStop hook in ${result.path}\n  command: ${result.command}\n`
  );
  return 0;
};

const runUninstall = async (): Promise<number> => {
  const result = await uninstallHook();
  process.stdout.write(
    result.removed === 0
      ? `no symbiot-copilot hook found in ${result.path}\n`
      : `removed symbiot-copilot hook from ${result.path}\n`
  );
  return 0;
};

const dispatch = async (argv: string[]): Promise<number> => {
  const [command] = argv;
  switch (command) {
    case "install-hook":
      return runInstall();
    case "uninstall-hook":
      return runUninstall();
    case "run-hook":
      return runHook(argv.slice(1));
    case "annotate":
      return runAnnotate(argv[1]);
    default:
      return usage();
  }
};

dispatch(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
);
