import { expect } from "@playwright/test";

import { Given, When, Then } from "../support/bdd.ts";

When("I clear all annotations and confirm", async ({ page }) => {
  await page.getByTestId("sidebar-clear-all").click();
  await page.getByTestId("sidebar-clear-confirm").click();
});

When("I remove the annotation on card {int} and confirm", async ({ page }, n: number) => {
  await page
    .locator('[data-testid$="-remove"][data-sidebar="menu-action"]')
    .nth(n - 1)
    .click();
  await page.getByTestId("sidebar-entry-remove-confirm").click();
});

When("I open the remove dialog on card {int} and cancel", async ({ page }, n: number) => {
  await page
    .locator('[data-testid$="-remove"][data-sidebar="menu-action"]')
    .nth(n - 1)
    .click();
  await page.getByTestId("sidebar-entry-remove-cancel").click();
});

When("I click the first sidebar annotation entry", async ({ page }) => {
  await page.locator('[data-testid^="sidebar-entry-"]').first().click();
});

Given("the scrollIntoView calls are spied on", async ({ page }) => {
  await page.addInitScript(() => {
    const counter = { calls: 0 };
    (window as unknown as { __scrollSpy: { calls: number } }).__scrollSpy = counter;
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element, ...args: unknown[]): void {
      counter.calls += 1;
      return original.apply(this, args as Parameters<typeof original>);
    };
  });
});

Then("no annotation anchor was scrolled into view", async ({ page }) => {
  const calls = await page.evaluate(
    () => (window as unknown as { __scrollSpy: { calls: number } }).__scrollSpy.calls
  );
  expect(calls).toBe(0);
});

Then("the sidebar total count reads {string}", async ({ page }, expected: string) => {
  await expect(page.getByTestId("sidebar-total-count")).toHaveText(expected);
});
