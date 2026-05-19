/**
 * Cross-platform "open this URL in the default browser" helper. Spawns the
 * OS-native opener (`open` / `xdg-open` / `cmd /c start`) detached so the
 * viewer process can exit while the browser tab stays alive.
 */
import { spawn } from "node:child_process";

const platformOpener = (): { command: string; args: string[] } => {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: [] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", '""'] };
    default:
      return { command: "xdg-open", args: [] };
  }
};

/**
 * Open the given URL in the user's default browser. Detached so the parent
 * process can exit independently.
 */
export const openBrowser = (url: string): void => {
  const { command, args } = platformOpener();
  const child = spawn(command, [...args, url], { detached: true, stdio: "ignore" });
  child.unref();
};
