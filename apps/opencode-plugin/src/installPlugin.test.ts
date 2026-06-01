import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installPlugin, selectPluginSpecifier, uninstallPlugin } from "./installPlugin.ts";

let home = "";
let originalHome: string | undefined;

const loaderPath = (): string =>
  join(home, ".config", "opencode", "plugins", "symbiot-opencode.ts");

beforeEach(async () => {
  originalHome = process.env.HOME;
  home = await mkdtemp(join(tmpdir(), "opencode-install-"));
  process.env.HOME = home;
});

afterEach(async () => {
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

describe("installPlugin", () => {
  it("writes an owned loader that re-exports the plugin source", async () => {
    const { path, source } = await installPlugin();
    expect(path).toBe(loaderPath());
    const contents = await readFile(path, "utf8");
    expect(contents).toContain("@managed-by symbiot-opencode");
    expect(contents).toContain(`export { SymbiotOpenCodePlugin } from ${JSON.stringify(source)}`);
    expect(source).toMatch(/plugin\.ts$/);
  });

  it("is idempotent — re-running produces a byte-identical file", async () => {
    await installPlugin();
    const first = await readFile(loaderPath(), "utf8");
    await installPlugin();
    expect(await readFile(loaderPath(), "utf8")).toBe(first);
  });
});

describe("selectPluginSpecifier", () => {
  it("returns the bare package name when installed via npm (node_modules)", () => {
    expect(
      selectPluginSpecifier(
        "/home/u/.config/opencode/node_modules/@symbiot/opencode-plugin/dist/installPlugin.js"
      )
    ).toBe("@symbiot/opencode-plugin");
  });

  it("returns the sibling source plugin.ts path from the repo (dev)", () => {
    expect(selectPluginSpecifier("/repo/apps/opencode-plugin/src/installPlugin.ts")).toBe(
      "/repo/apps/opencode-plugin/src/plugin.ts"
    );
  });
});

describe("uninstallPlugin", () => {
  it("removes the loader it owns, then reports nothing on a second run", async () => {
    await installPlugin();
    expect(await uninstallPlugin()).toMatchObject({ removed: 1 });
    expect(await uninstallPlugin()).toMatchObject({ removed: 0 });
  });

  it("leaves a foreign (hand-edited) loader untouched", async () => {
    await mkdir(dirname(loaderPath()), { recursive: true });
    await writeFile(loaderPath(), "// hand written\n", "utf8");
    expect(await uninstallPlugin()).toMatchObject({ removed: 0 });
    expect(await readFile(loaderPath(), "utf8")).toBe("// hand written\n");
  });
});
