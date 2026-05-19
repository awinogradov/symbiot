import { readFile } from "node:fs/promises";

import type { ViewerMode } from "./shared/api-types.ts";
import { startServer, type RunningServer } from "./server/startServer.ts";

interface CliArgs {
  planPath: string | null;
  noOpen: boolean;
  keepAlive: boolean;
  decisionFile: string | null;
  port: number | null;
  mode: ViewerMode;
}

const flagValue = (argv: string[], flag: string): string | null => {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? (argv[idx + 1] ?? null) : null;
};

const parsePort = (raw: string | null): number | null => {
  if (raw === null) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const parseMode = (raw: string | null): ViewerMode => (raw === "annotate" ? "annotate" : "plan");

const parseArgs = (argv: string[]): CliArgs => ({
  planPath: flagValue(argv, "--plan"),
  noOpen: argv.includes("--no-open"),
  keepAlive: argv.includes("--keep-alive"),
  decisionFile: flagValue(argv, "--decision-file"),
  port: parsePort(flagValue(argv, "--port")),
  mode: parseMode(flagValue(argv, "--mode")),
});

const readStdin = async (): Promise<string> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  return Buffer.concat(chunks).toString("utf8");
};

const readPlan = async (planPath: string | null): Promise<string> => {
  if (planPath !== null) return readFile(planPath, "utf8");
  if (process.stdin.isTTY) throw new Error("Pass --plan <file> or pipe markdown on stdin.");
  return readStdin();
};

const printDecision = (
  decision:
    | { kind: "approve" }
    | { kind: "deny"; feedback: string }
    | { kind: "feedback"; feedback: string }
): void => {
  if (decision.kind === "approve") {
    process.stdout.write("APPROVED\n");
    return;
  }
  if (decision.kind === "feedback") {
    process.stdout.write(`${decision.feedback}\n`);
    return;
  }
  process.stdout.write(`DENIED\n${decision.feedback}\n`);
};

const exitCodeFor = (kind: "approve" | "deny" | "feedback"): number => {
  if (kind === "approve") return 0;
  if (kind === "feedback") return 0;
  return 2;
};

const runOneShot = async (server: RunningServer): Promise<void> => {
  const decision = await server.resolved;
  await server.stop();
  printDecision(decision);
  process.exit(exitCodeFor(decision.kind));
};

const runKeepAlive = (server: RunningServer): void => {
  const shutdown = async (): Promise<void> => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const plan = await readPlan(args.planPath);
  const server = await startServer({
    plan,
    openInBrowser: !args.noOpen,
    decisionFile: args.decisionFile,
    port: args.port,
    mode: args.mode,
  });
  process.stdout.write(`symbiot viewer listening at ${server.url}\n`);
  if (args.keepAlive) {
    runKeepAlive(server);
    return;
  }
  await runOneShot(server);
};

main().catch((error: unknown) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
});
