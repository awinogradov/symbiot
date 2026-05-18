import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**", "apps/**"],
    environment: "node",
  },
});
