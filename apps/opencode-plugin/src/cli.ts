#!/usr/bin/env bun
/**
 * `symbiot-opencode` CLI entrypoint. Dispatches to:
 *  - `install`        — write the plugin loader into ~/.config/opencode/plugins/symbiot-opencode.ts
 *  - `uninstall`      — remove symbiot's loader from the OpenCode plugins directory
 *  - `annotate <file>`— launch the viewer in annotate mode against a markdown file
 *
 * The in-process plugin itself lives in `./plugin.ts` and is loaded by OpenCode;
 * this CLI only manages registration and the manual annotate path.
 *
 * Exit codes: 0 on success, 1 on unhandled error, 64 on usage error.
 */
import { runAnnotate } from "./annotate.ts";
import { installPlugin, uninstallPlugin } from "./installPlugin.ts";

const usage = (): never => {
  process.stderr.write("usage: symbiot-opencode <install|uninstall|annotate <file.md>>\n");
  process.exit(64);
};

const runInstall = async (): Promise<number> => {
  const result = await installPlugin();
  process.stdout.write(
    `installed symbiot-opencode plugin loader at ${result.path}\n  source: ${result.source}\n`
  );
  return 0;
};

const runUninstall = async (): Promise<number> => {
  const result = await uninstallPlugin();
  process.stdout.write(
    result.removed === 0
      ? `no symbiot-opencode loader found at ${result.path}\n`
      : `removed symbiot-opencode loader from ${result.path}\n`
  );
  return 0;
};

const dispatch = async (argv: string[]): Promise<number> => {
  const [command] = argv;
  switch (command) {
    case "install":
      return runInstall();
    case "uninstall":
      return runUninstall();
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
