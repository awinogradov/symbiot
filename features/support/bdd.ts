import { test as base } from "playwright-bdd";
import { createBdd } from "playwright-bdd";

import { createCodexHookController, type CodexHookController } from "./codexProcess.ts";
import { createCopilotHookController, type CopilotHookController } from "./copilotProcess.ts";
import { recordCoverage, isCoverageEnabled } from "./coverage.ts";
import { createGeminiHookController, type GeminiHookController } from "./geminiProcess.ts";
import { createOpencodeHookController, type OpencodeHookController } from "./opencodeProcess.ts";
import { startWorkerViewers, type ViewerInstances } from "./viewers.ts";

interface WorkerFixtures {
  viewers: ViewerInstances;
}

interface CoverageFixture {
  autoCoverage: void;
}

interface ViewerUrlFixtures {
  annotateUrl: string;
  noHeadingUrl: string;
  symbiotHome: string;
  planDecisionFile: string;
  annotateDecisionFile: string;
}

interface CodexHookFixture {
  codexHook: CodexHookController;
}

interface GeminiHookFixture {
  geminiHook: GeminiHookController;
}

interface CopilotHookFixture {
  copilotHook: CopilotHookController;
}

interface OpencodeHookFixture {
  opencodeHook: OpencodeHookController;
}

export const test = base.extend<
  CoverageFixture &
    ViewerUrlFixtures &
    CodexHookFixture &
    GeminiHookFixture &
    CopilotHookFixture &
    OpencodeHookFixture,
  WorkerFixtures
>({
  // One set of plan/annotate/no-heading viewers per worker, each HOME-isolated on
  // OS-assigned ports with private decision files — the isolation that lets the
  // suite run `fullyParallel` without scenarios colliding on shared state.
  viewers: [
    async ({}, provide) => {
      const worker = await startWorkerViewers();
      try {
        await provide(worker.instances);
      } finally {
        await worker.stop();
      }
    },
    { scope: "worker" },
  ],
  // Point Playwright's `baseURL` (so `page.goto("/")` and the `request` fixture) at
  // this worker's plan viewer instead of the removed global webServer.
  baseURL: async ({ viewers }, provide) => {
    await provide(viewers.planUrl);
  },
  annotateUrl: async ({ viewers }, provide) => {
    await provide(viewers.annotateUrl);
  },
  noHeadingUrl: async ({ viewers }, provide) => {
    await provide(viewers.noHeadingUrl);
  },
  symbiotHome: async ({ viewers }, provide) => {
    await provide(viewers.home);
  },
  planDecisionFile: async ({ viewers }, provide) => {
    await provide(viewers.planDecisionFile);
  },
  annotateDecisionFile: async ({ viewers }, provide) => {
    await provide(viewers.annotateDecisionFile);
  },
  autoCoverage: [
    async ({ page }, use, testInfo) => {
      if (!isCoverageEnabled()) {
        await use();
        return;
      }
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();
      const js = await page.coverage.stopJSCoverage();
      await recordCoverage(js, testInfo.testId);
    },
    { auto: true },
  ],
  // Per-scenario handle to a real `symbiot-codex run-hook` subprocess. Only the
  // codex round-trip feature uses it; other scenarios never call `start`, so the
  // teardown is a no-op for them.
  codexHook: async ({}, provide) => {
    const controller = createCodexHookController();
    await provide(controller);
    await controller.dispose();
  },
  // Per-scenario handle to a real `symbiot-gemini run-hook` subprocess. Only the
  // gemini round-trip feature uses it; other scenarios never call `start`, so the
  // teardown is a no-op for them.
  geminiHook: async ({}, provide) => {
    const controller = createGeminiHookController();
    await provide(controller);
    await controller.dispose();
  },
  // Per-scenario handle to a real `symbiot-copilot run-hook` subprocess. Only the
  // copilot round-trip feature uses it; other scenarios never call `start`, so the
  // teardown is a no-op for them.
  copilotHook: async ({}, provide) => {
    const controller = createCopilotHookController();
    await provide(controller);
    await controller.dispose();
  },
  // Per-scenario handle to the in-process OpenCode plugin harness. Its viewer port is
  // sharded by worker index so concurrent workers never collide. Only the opencode
  // round-trip feature uses it; other scenarios never call `start`, so teardown is a no-op.
  opencodeHook: async ({}, provide, testInfo) => {
    const controller = createOpencodeHookController(testInfo.parallelIndex);
    await provide(controller);
    await controller.dispose();
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
