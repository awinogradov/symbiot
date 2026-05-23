import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type PluginOption } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { resolveBuildInfo } from "./buildInfo.ts";

// Resolved once at config load. Frozen at dev-server / build start by design —
// restart Vite to refresh these values after a new commit or version bump.
const buildInfo = resolveBuildInfo();

const bundleAnalyze = process.env.SYMBIOT_BUNDLE_ANALYZE === "1";

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
      ...(bundleAnalyze
        ? [
            visualizer({
              filename: "bundle-stats/index.html",
              template: "treemap",
              gzipSize: true,
              brotliSize: true,
              sourcemap: false,
            }) as PluginOption,
          ]
        : []),
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
