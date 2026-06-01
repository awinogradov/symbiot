import { rm, readFile } from "node:fs/promises";

import { expect } from "@playwright/test";

/** Decision payload written by the viewer routes when `--decision-file` is set. */
export interface DecisionRecord {
  kind: "approve" | "deny" | "feedback";
  feedback?: string;
  at?: number;
}

const readRecord = async (path: string): Promise<DecisionRecord> => {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as DecisionRecord;
};

const waitForRecord = async (path: string, timeoutMs: number): Promise<DecisionRecord> => {
  let result: DecisionRecord | undefined;
  await expect
    .poll(
      async (): Promise<boolean> => {
        try {
          result = await readRecord(path);
          return true;
        } catch {
          return false;
        }
      },
      {
        timeout: timeoutMs,
        message: `No decision recorded at ${path} within ${timeoutMs}ms`,
      }
    )
    .toBe(true);
  if (result === undefined) {
    throw new Error(`No decision recorded at ${path}`);
  }
  return result;
};

/**
 * Decision-file helpers parameterised by path. The path comes from the worker-scoped
 * `planDecisionFile` / `annotateDecisionFile` fixtures (see {@link ./bdd.ts}) so each
 * worker reads and resets its own viewer's decisions — never a sibling worker's.
 */

/** Remove the decision file so a scenario starts from a clean slate. Idempotent. */
export const resetDecisionFile = (path: string): Promise<void> => rm(path, { force: true });

/** Poll until the decision file exists, up to `timeoutMs` (default 5s). */
export const waitForDecision = (path: string, timeoutMs = 5_000): Promise<DecisionRecord> =>
  waitForRecord(path, timeoutMs);
