#!/usr/bin/env bun
/**
 * `symbiot-codex` CLI entrypoint. Dispatches to:
 *  - `install-hook`   — register the `Stop` hook in ~/.codex/hooks.json
 *  - `uninstall-hook` — remove every symbiot-codex entry from ~/.codex/hooks.json
 *  - `run-hook`       — handler Codex invokes on `Stop` (reads stdin); accepts
 *                       optional `--port` / `--no-open` / `--decision-file`
 *  - `annotate <file>`— launch the viewer in annotate mode against a markdown file
 *
 * Exit codes: 0 on success, 1 on unhandled error, 64 on usage error.
 */
import { installHook, uninstallHook } from "./installHook.ts";
import { runAnnotate } from "./runAnnotate.ts";
import { runHook } from "./runHook.ts";

const usage = (): never => {
  process.stderr.write(
    "usage: symbiot-codex <install-hook|uninstall-hook|run-hook|annotate <file.md>>\n"
  );
  process.exit(64);
};

const runInstall = async (): Promise<number> => {
  const result = await installHook();
  process.stdout.write(
    `installed symbiot-codex Stop hook in ${result.path}\n  command: ${result.command}\n`
  );
  return 0;
};

const runUninstall = async (): Promise<number> => {
  const result = await uninstallHook();
  process.stdout.write(
    result.removed === 0
      ? `no symbiot-codex hook found in ${result.path}\n`
      : `removed ${result.removed} symbiot-codex hook entr${result.removed === 1 ? "y" : "ies"} from ${result.path}\n`
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
