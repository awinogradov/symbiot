import { rm, readFile, stat } from "node:fs/promises";

import { decisionFile } from "./world.ts";

/** Decision payload written by the viewer routes when `--decision-file` is set. */
export interface DecisionRecord {
  kind: "approve" | "deny";
  feedback?: string;
  at: number;
}

/** Remove the decision file so a scenario starts from a clean slate. Idempotent. */
export const resetDecisionFile = async (): Promise<void> => {
  await rm(decisionFile, { force: true });
};

/** Parse the decision file. Throws if missing — call after the viewer has resolved. */
export const readDecision = async (): Promise<DecisionRecord> => {
  const raw = await readFile(decisionFile, "utf8");
  return JSON.parse(raw) as DecisionRecord;
};

/** Poll until the decision file exists, up to `timeoutMs` (default 5s). */
export const waitForDecision = async (timeoutMs = 5_000): Promise<DecisionRecord> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await stat(decisionFile);
      return await readDecision();
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`No decision recorded within ${timeoutMs}ms`);
};
