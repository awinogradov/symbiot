/**
 * Stdin + argv helpers shared by the hook handlers, plus the "stop-style" plan
 * extractor that Codex and Gemini differ on by only two strings.
 *
 * {@link readHookInput} reads the JSON the host pipes on stdin (defensive: empty
 * or malformed input degrades to `{}` so a stuck hook never blocks the host).
 * {@link flagValue} / {@link parsePort} parse the `--port` / `--no-open` test
 * flags. {@link createStopPlanExtractor} builds the `planFrom…` function for a
 * single-event, single-message-field hook (Codex `Stop`/`last_assistant_message`,
 * Gemini `AfterAgent`/`prompt_response`).
 *
 * @example
 * ```ts
 * import { readHookInput, createStopPlanExtractor } from "@symbiot/agent-runtime/hook-input";
 * const planFromStop = createStopPlanExtractor({ eventName: "Stop", messageField: "last_assistant_message" });
 * const plan = planFromStop(await readHookInput());
 * ```
 */

/** Read stdin and parse it as JSON. Empty or malformed input resolves to `{}`. */
export const readHookInput = async (): Promise<unknown> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    // Malformed payload → pass through. A spurious non-zero exit on a stop-style
    // hook risks being read as a block/retry.
    return {};
  }
};

/** Value following `flag` in `argv`, or `null` when the flag is absent or trailing. */
export const flagValue = (argv: string[], flag: string): string | null => {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? (argv[idx + 1] ?? null) : null;
};

/** Parse a strict TCP port (1-65535), or `null` when `raw` is null/malformed/out-of-range. */
export const parsePort = (raw: string | null): number | null => {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  return n >= 1 && n <= 65535 ? n : null;
};

/** Narrow `value` to a non-empty string — the "present and not blank" guard for hook payload fields. */
export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** Narrow `value` to a non-null object so its fields can be read off an `unknown` hook payload. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Options for {@link createStopPlanExtractor}. */
export interface StopPlanExtractorOptions {
  /** The `hook_event_name` this handler reviews (e.g. `Stop`, `AfterAgent`). */
  eventName: string;
  /** The stdin field carrying the message to review (e.g. `last_assistant_message`). */
  messageField: string;
}

/**
 * Build a pure `planFrom…(input)` extractor for a single-event stop-style hook.
 * Returns the message only for a genuine event of `eventName` that is not a
 * re-entrant continuation (`stop_hook_active`) and carries a non-empty
 * `messageField`; otherwise `null` (pass through).
 */
export const createStopPlanExtractor =
  ({ eventName, messageField }: StopPlanExtractorOptions) =>
  (input: unknown): string | null => {
    if (!isRecord(input)) return null;
    if (input.hook_event_name !== eventName) return null;
    if (input.stop_hook_active === true) return null;
    const message = input[messageField];
    return isNonEmptyString(message) ? message : null;
  };
