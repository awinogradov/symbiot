import { expect } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";

When("I toggle task checkbox {int}", async ({ page }, n: number) => {
  await page
    .getByTestId("editor-task-checkbox")
    .nth(n - 1)
    .click();
});

Then("the annotation sidebar shows a task entry {string}", async ({ page }, body: string) => {
  await expect(
    page.locator('[data-testid^="sidebar-entry-"][data-kind="task"]', { hasText: body })
  ).toHaveCount(1);
});
