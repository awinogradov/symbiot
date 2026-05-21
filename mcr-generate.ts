/**
 * Finalizer for the e2e coverage run. Each scenario fixture in
 * `features/support/bdd.ts` dumps its Playwright V8 coverage payload to
 * `coverage/raw/NNNN-<scenario>.json`. This script runs once after the suite
 * (under Node — MCR uses `v8.setFlagsFromString`, which Bun does not implement)
 * to aggregate every payload and emit the configured reports.
 *
 * Invoked from `bun run test:e2e:coverage` via `node --experimental-strip-types`.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import MCR from "monocart-coverage-reports";

import { coverageOptions } from "./mcr.config.ts";

const rawDir = "./coverage/raw";

const main = async (): Promise<void> => {
  const mcr = MCR(coverageOptions);
  let files: string[];
  try {
    files = (await readdir(rawDir)).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  if (files.length === 0) {
    process.stdout.write(`[mcr] no coverage payloads found in ${rawDir}\n`);
    return;
  }
  for (const file of files) {
    const raw = await readFile(join(rawDir, file), "utf8");
    await mcr.add(JSON.parse(raw));
  }
  const result = await mcr.generate();
  if (result === undefined) {
    process.stdout.write("[mcr] no coverage data collected\n");
    return;
  }
  process.stdout.write(`[mcr] report written to ${result.reportPath}\n`);
};

await main();
