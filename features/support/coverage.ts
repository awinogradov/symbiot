import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Page } from "@playwright/test";

import { repoRoot } from "./world.ts";

type JSCoverageEntry = Awaited<ReturnType<Page["coverage"]["stopJSCoverage"]>>[number];

const rawCoverageDir = join(repoRoot, "coverage", "raw");

export const isCoverageEnabled = (): boolean => process.env["COVERAGE"] === "1";

export const recordCoverage = async (js: JSCoverageEntry[], testId: string): Promise<void> => {
  await mkdir(rawCoverageDir, { recursive: true });
  const data = js.map((entry) => ({
    url: entry.url,
    scriptId: entry.scriptId,
    source: entry.source,
    functions: entry.functions,
  }));
  const file = join(rawCoverageDir, `${testId}.json`);
  await writeFile(file, JSON.stringify(data));
};
