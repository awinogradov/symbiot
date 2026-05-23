import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { resolveBuildInfo } from "./buildInfo.ts";

// Resolved once at config load. Frozen at dev-server / build start by design —
// restart Vite to refresh these values after a new commit or version bump.
const buildInfo = resolveBuildInfo();

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  return {
    root: ".",
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile({
        inlinePattern: ["**/*.js", "**/*.css"],
        removeViteModuleLoader: true,
      }),
    ],
    define: {
      symbiotBuildInfo: JSON.stringify(buildInfo),
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: "http://127.0.0.1:5174", changeOrigin: false },
      },
    },
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
      target: "es2022",
      sourcemap: isDev,
      minify: !isDev,
    },
  };
});
