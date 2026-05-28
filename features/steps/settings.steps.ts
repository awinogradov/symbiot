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

Then("the prose body text uses the light-theme color", async ({ page }) => {
  // Pin the joint invariant: text is clearly dark AND background is clearly
  // light. A single-sided check would also pass when Dark theme accidentally
  // applied (dark text on dark bg). Modern Chromium preserves OKLCH-source
  // colors in `getComputedStyle`, so parse `oklch(L C H)` and `lab(L a b)`
  // (lightness in [0, 1] after normalization) and `rgb(r, g, b)` (computed
  // via relative luminance) and compare on a single normalized 0–1 scale.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(false);
  await page.getByTestId("editor-root").waitFor({ state: "visible" });
  const sample = await page.evaluate(() => {
    const paragraph = document.querySelector('[data-testid="editor-paragraph"]');
    if (paragraph === null) return null;
    return {
      color: getComputedStyle(paragraph).color,
      background: getComputedStyle(document.body).backgroundColor,
    };
  });
  expect(sample).not.toBeNull();
  const lightness = (color: string): number => {
    const oklch = /oklch\(\s*([\d.]+)/.exec(color);
    if (oklch !== null) return Number(oklch[1]);
    const lab = /lab\(\s*([\d.]+)/.exec(color);
    if (lab !== null) return Number(lab[1]) / 100;
    const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
    if (rgb !== null) {
      const r = Number(rgb[1]) / 255;
      const g = Number(rgb[2]) / 255;
      const b = Number(rgb[3]) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    throw new Error(`Cannot parse color value: ${color}`);
  };
  expect(lightness(sample!.color)).toBeLessThan(0.5);
  expect(lightness(sample!.background)).toBeGreaterThan(0.85);
});
