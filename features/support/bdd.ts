import { test as base } from "playwright-bdd";
import { createBdd } from "playwright-bdd";

import { recordCoverage, isCoverageEnabled } from "./coverage.ts";

interface CoverageFixture {
  autoCoverage: void;
}

export const test = base.extend<CoverageFixture>({
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
});

export const { Given, When, Then, Before, After } = createBdd(test);
