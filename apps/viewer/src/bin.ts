import { readFile } from "node:fs/promises";

import { startServer } from "./server/startServer.ts";

const parseArgs = (argv: string[]): { planPath: string | null } => {
  const idx = argv.indexOf("--plan");
  return { planPath: idx >= 0 ? (argv[idx + 1] ?? null) : null };
};

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

const main = async (): Promise<void> => {
  const { planPath } = parseArgs(process.argv.slice(2));
  const plan = await readPlan(planPath);
  const server = await startServer({ plan });
  process.stdout.write(`symbiot viewer listening at ${server.url}\n`);
  const decision = await server.resolved;
  await server.stop();
  printDecision(decision);
  process.exit(decision.kind === "approve" ? 0 : 2);
};

main().catch((error: unknown) => {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
});
