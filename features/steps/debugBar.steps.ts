import { expect, type Page } from "@playwright/test";

import { Given, Then, When } from "../support/bdd.ts";

const badge = (page: Page): ReturnType<typeof page.getByTestId> =>
  page.getByTestId("debug-bar-badge");

// Version grammar mirrors `apps/viewer/buildInfo.ts`: the plugin.json
// `version` field flows through verbatim, so prereleases (`0.2.0-rc.1`,
// `0.2.0+build.5`) are valid. The SHA is whatever `git rev-parse --short HEAD`
// returns OR the literal `"dev"` fallback when the build runs outside a git
// checkout (see `apps/viewer/README.md`).
const versionGrammar = String.raw`\d+\.\d+\.\d+(?:[.\-+][\w.\-+]+)?`;
const shaShortGrammar = String.raw`[0-9a-f]+|dev`;
const idleBadgeRegex = new RegExp(`^v(?:${versionGrammar}) · (?:${shaShortGrammar})$`);

const badgeTextFor = (state: "idle" | "copied" | "failed"): string | RegExp => {
  if (state === "copied") return "SHA copied";
  if (state === "failed") return "Copy failed";
  return idleBadgeRegex;
};

/**
 * Override `navigator.clipboard` before the SHA click handler runs. `value`
 * is whatever the test wants `navigator.clipboard` to be: a writable stub,
 * a write-rejecting stub, or `undefined` for the missing-clipboard branch.
 */
const stubClipboard = async (page: Page, mode: "reject" | "missing"): Promise<void> => {
  await page.evaluate((m: "reject" | "missing") => {
    const value =
      m === "missing"
        ? undefined
        : {
            writeText: (): Promise<void> => Promise.reject(new Error("denied")),
            readText: (): Promise<string> => Promise.resolve(""),
          };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value });
  }, mode);
};

/**
 * Replace `navigator.clipboard.writeText` with a spy that pushes each written
 * value onto `window.__clipboardWrites`. The original implementation still
 * runs so the badge state transitions happen normally.
 */
const installClipboardSpy = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const slot: string[] = [];
    (window as unknown as { __clipboardWrites: string[] }).__clipboardWrites = slot;
    const original = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text: string): Promise<void> => {
      slot.push(text);
      return original(text);
    };
  });
};

const readClipboardWrites = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __clipboardWrites: string[] }).__clipboardWrites);

Then("the debug bar badge is visible", async ({ page }) => {
  await expect(badge(page)).toBeVisible();
});

When("I click the debug bar badge", async ({ page }) => {
  await badge(page).click();
});

Then("the debug bar badge text shows the {string} state", async ({ page }, state: string) => {
  const matcher = badgeTextFor(state as "idle" | "copied" | "failed");
  await expect(badge(page)).toHaveText(matcher);
});

Given("the clipboard writes are spied on", async ({ page }) => {
  await installClipboardSpy(page);
});

Then("the clipboard received the full build SHA", async ({ page }) => {
  // The build-time `symbiotBuildInfo.shaFull` is substituted at build time
  // and is not exposed on `window`, so we verify shape rather than value:
  // exactly one write of either a 40-char lowercase hex SHA or the literal
  // `"dev"` fallback (see `apps/viewer/buildInfo.ts`).
  await expect
    .poll(() => readClipboardWrites(page))
    .toEqual([expect.stringMatching(/^(?:[0-9a-f]{40}|dev)$/)]);
});

Given("the clipboard rejects writes", async ({ page }) => {
  await stubClipboard(page, "reject");
});

Given("the clipboard is unavailable", async ({ page }) => {
  await stubClipboard(page, "missing");
});

When("I wait {int} ms", async ({ page }, ms: number) => {
  await page.waitForTimeout(ms);
});
