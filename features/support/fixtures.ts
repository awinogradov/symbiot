import { rm, readFile } from "node:fs/promises";

import { expect } from "@playwright/test";

import { annotateDecisionFile, decisionFile } from "./world.ts";

/** Decision payload written by the viewer routes when `--decision-file` is set. */
export interface DecisionRecord {
  kind: "approve" | "deny" | "feedback";
  feedback?: string;
  at?: number;
}

const resetFile = async (path: string): Promise<void> => {
  await rm(path, { force: true });
};

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

/** Remove the plan-mode decision file so a scenario starts from a clean slate. Idempotent. */
export const resetDecisionFile = (): Promise<void> => resetFile(decisionFile);

/** Parse the plan-mode decision file. Throws if missing — call after the viewer has resolved. */
export const readDecision = (): Promise<DecisionRecord> => readRecord(decisionFile);

/** Poll until the plan-mode decision file exists, up to `timeoutMs` (default 5s). */
export const waitForDecision = (timeoutMs = 5_000): Promise<DecisionRecord> =>
  waitForRecord(decisionFile, timeoutMs);

/** Remove the annotate-mode decision file so a scenario starts from a clean slate. Idempotent. */
export const resetAnnotateDecisionFile = (): Promise<void> => resetFile(annotateDecisionFile);

/** Poll until the annotate-mode decision file exists, up to `timeoutMs` (default 5s). */
export const waitForAnnotateDecision = (timeoutMs = 5_000): Promise<DecisionRecord> =>
  waitForRecord(annotateDecisionFile, timeoutMs);
