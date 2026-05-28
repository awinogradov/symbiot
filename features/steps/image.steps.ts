import { expect } from "@playwright/test";

import { When, Then } from "../support/bdd.ts";
import { transparentPng } from "../support/testAssets.ts";

const pngBytes = transparentPng();

When("I attach a PNG via the composer image button", async ({ page }) => {
  // Composer popover lives in a Radix portal at body level. Wait for it first,
  // then set the file input directly to bypass viewport-position quirks of the
  // hidden file picker trigger.
  await page.getByTestId("annotation-composer").waitFor({ state: "visible" });
  await page
    .getByTestId("image-attach-input")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: pngBytes });
});

Then("the composer shows an image preview", async ({ page }) => {
  const preview = page.getByTestId("image-preview-list");
  await expect(preview).toBeVisible();
  await expect(preview.getByTestId("image-preview-img")).toHaveCount(1);
});
