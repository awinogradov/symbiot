/**
 * Shared CLI dispatcher shell for the agent integration bins.
 *
 * Every `symbiot-*` bin parses `argv`, routes the first token to a command
 * handler, prints a usage line + exit 64 on an unknown command, and maps an
 * unhandled rejection to a stderr message + exit 1. {@link createCli} owns that
 * scaffolding; each app supplies its bin name, usage string, and the handler map
 * (the command set differs: hook apps use `install-hook`/`run-hook`/…, OpenCode
 * uses `install`/`uninstall`/`annotate`).
 *
 * `dispatch` is exported (separately from `run`) so the routing is unit-testable
 * without terminating the test process — `run` owns the `process.exit` calls.
 *
 * @example
 * ```ts
 * import { createCli } from "@symbiot/agent-runtime/cli";
 * createCli({
 *   binName: "symbiot-codex",
 *   usageCommands: "<install-hook|uninstall-hook|run-hook|annotate <file.md>>",
 *   handlers: { "run-hook": (argv) => runHook(argv), annotate: (argv) => runAnnotate(argv[0]) },
 * }).run(process.argv.slice(2));
 * ```
 */

/** A command handler receives the argv tail (everything after the command) and resolves to an exit code. */
export type CommandHandler = (argv: string[]) => Promise<number> | number;

/** Options for {@link createCli}. */
export interface CreateCliOptions {
  /** Bin name shown in the usage line (e.g. `symbiot-codex`). */
  binName: string;
  /** The `<…>` command summary shown after the bin name in usage. */
  usageCommands: string;
  /** Command → handler map. The argv tail is passed to the matched handler. */
  handlers: Record<string, CommandHandler>;
}

/** A dispatcher + process runner built from {@link CreateCliOptions}. */
export interface Cli {
  /** Route `argv` to a handler and resolve to the exit code (64 for unknown commands). */
  dispatch: (argv: string[]) => Promise<number>;
  /** Run `dispatch(argv)` and `process.exit` with its code (or 1 on an unhandled error). */
  run: (argv: string[]) => void;
}

export const createCli = ({ binName, usageCommands, handlers }: CreateCliOptions): Cli => {
  const dispatch = async (argv: string[]): Promise<number> => {
    const [command, ...rest] = argv;
    const handler = command === undefined ? undefined : handlers[command];
    if (handler === undefined) {
      process.stderr.write(`usage: ${binName} ${usageCommands}\n`);
      return 64;
    }
    return handler(rest);
  };

  const run = (argv: string[]): void => {
    dispatch(argv).then(
      (code) => process.exit(code),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${message}\n`);
        process.exit(1);
      }
    );
  };

  return { dispatch, run };
};
