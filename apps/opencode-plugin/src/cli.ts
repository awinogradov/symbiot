#!/usr/bin/env bun
/**
 * `symbiot-opencode` CLI entrypoint. Dispatches via the shared {@link createCli} to:
 *  - `install`        — write the plugin loader into ~/.config/opencode/plugins/symbiot-opencode.ts
 *  - `uninstall`      — remove symbiot's loader from the OpenCode plugins directory
 *  - `annotate <file>`— launch the viewer in annotate mode against a markdown file
 *
 * The in-process plugin itself lives in `./plugin.ts` and is loaded by OpenCode;
 * this CLI only manages registration and the manual annotate path.
 *
 * Exit codes: 0 on success, 1 on unhandled error, 64 on usage error.
 */
import { createCli } from "@symbiot/agent-runtime/cli";

import { runAnnotate } from "./annotate.ts";
import { installPlugin, uninstallPlugin } from "./installPlugin.ts";

createCli({
  binName: "symbiot-opencode",
  usageCommands: "<install|uninstall|annotate <file.md>>",
  handlers: {
    install: async () => {
      const { path, source } = await installPlugin();
      process.stdout.write(
        `installed symbiot-opencode plugin loader at ${path}\n  source: ${source}\n`
      );
      return 0;
    },
    uninstall: async () => {
      const { path, removed } = await uninstallPlugin();
      process.stdout.write(
        removed === 0
          ? `no symbiot-opencode loader found at ${path}\n`
          : `removed symbiot-opencode loader from ${path}\n`
      );
      return 0;
    },
    annotate: (argv) => runAnnotate(argv[0]),
  },
}).run(process.argv.slice(2));
