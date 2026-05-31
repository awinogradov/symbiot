import { test as base } from "playwright-bdd";
import { createBdd } from "playwright-bdd";

import { createCodexHookController, type CodexHookController } from "./codexProcess.ts";
import { recordCoverage, isCoverageEnabled } from "./coverage.ts";
import { createGeminiHookController, type GeminiHookController } from "./geminiProcess.ts";

interface CoverageFixture {
  autoCoverage: void;
}

interface CodexHookFixture {
  codexHook: CodexHookController;
}

interface GeminiHookFixture {
  geminiHook: GeminiHookController;
}

export const test = base.extend<CoverageFixture & CodexHookFixture & GeminiHookFixture>({
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
});

export const { Given, When, Then, Before, After } = createBdd(test);
