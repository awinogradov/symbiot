import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

const pngBytes = Buffer.from(
  // 1x1 transparent PNG (mirrors `upload.steps.ts::buildPng`).
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

When("I attach a PNG via the composer image button", async ({ page }) => {
  // Composer popover lives in a Radix portal at body level. Wait for it first,
  // then set the file input directly to bypass viewport-position quirks of the
  // hidden file picker trigger.
  await page.getByTestId("comment-composer").waitFor({ state: "visible" });
  await page
    .getByTestId("image-attach-input")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: pngBytes });
});

Then("the composer shows an image preview", async ({ page }) => {
  const preview = page.getByTestId("image-preview-list");
  await expect(preview).toBeVisible();
  await expect(preview.locator("img")).toHaveCount(1);
});
