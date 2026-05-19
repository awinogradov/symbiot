import { readFile } from "node:fs/promises";

import { startServer, type RunningServer } from "./server/startServer.ts";

interface CliArgs {
  planPath: string | null;
  noOpen: boolean;
  keepAlive: boolean;
  decisionFile: string | null;
  port: number | null;
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

const parseArgs = (argv: string[]): CliArgs => ({
  planPath: flagValue(argv, "--plan"),
  noOpen: argv.includes("--no-open"),
  keepAlive: argv.includes("--keep-alive"),
  decisionFile: flagValue(argv, "--decision-file"),
  port: parsePort(flagValue(argv, "--port")),
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
  decision: { kind: "approve" } | { kind: "deny"; feedback: string }
): void => {
  if (decision.kind === "approve") {
    process.stdout.write("APPROVED\n");
    return;
  }
  process.stdout.write(`DENIED\n${decision.feedback}\n`);
};

const runOneShot = async (server: RunningServer): Promise<void> => {
  const decision = await server.resolved;
  await server.stop();
  printDecision(decision);
  process.exit(decision.kind === "approve" ? 0 : 2);
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
