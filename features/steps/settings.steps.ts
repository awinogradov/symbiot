import { expect } from "@playwright/test";

import { Given, When, Then } from "../support/bdd.ts";

Given("the OS color scheme is {string}", async ({ page }, scheme: string) => {
  await page.emulateMedia({ colorScheme: scheme as "light" | "dark" });
});

When("I open the Settings dialog", async ({ page }) => {
  await page.getByTestId("top-bar-settings").click();
  await page.getByTestId("settings-dialog").waitFor({ state: "visible" });
});

When("I choose the {string} theme", async ({ page }, label: string) => {
  await page.getByTestId(`settings-theme-${label.toLowerCase()}`).click();
});

When("I close the Settings dialog", async ({ page }) => {
  await page.keyboard.press("Escape");
  await page.getByTestId("settings-dialog").waitFor({ state: "hidden" });
});

When("I reload the viewer", async ({ page }) => {
  await page.reload();
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
});

Then("the html has the dark class", async ({ page }) => {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);
});

Then("the html does not have the dark class", async ({ page }) => {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(false);
});
