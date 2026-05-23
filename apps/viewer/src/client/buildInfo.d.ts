/**
 * Ambient declaration of the build-time constants global injected by
 * `apps/viewer/vite.config.ts` via Vite's `define` option. The value is
 * resolved at build/dev-server start by
 * {@link "../../buildInfo".resolveBuildInfo}.
 */
import type { BuildInfo } from "../../buildInfo.ts";

declare global {
  /** Build-time facts about the running viewer (version, git SHA, build timestamp). Statically replaced at build time. */
  const symbiotBuildInfo: BuildInfo;
}

export {};
