/**
 * Pure helper to extract the response a reviewer should see from an OpenCode
 * session's message list (`client.session.messages(...)` → `Array<{ info, parts }>`).
 *
 * Array order is not assumed: the most recent **assistant** message is picked by
 * `info.time.created`, and only its `text` parts are joined — tool-call/reasoning
 * parts are dropped so the reviewer sees prose, not JSON noise.
 *
 * @example
 *   const response = extractLatestAssistantText(await client.session.messages({ path: { id } }));
 */

/** Minimal structural shape of one message part (the SDK `Part` union is assignable to this). */
export interface MessagePart {
  type: string;
  text?: string;
}

/** Minimal structural shape of one message + its parts (the SDK message rows are assignable). */
export interface MessageWithParts {
  info: { role: string; time?: { created?: number } };
  parts: MessagePart[];
}

const createdAt = (message: MessageWithParts): number => message.info.time?.created ?? 0;

const isTextPart = (part: MessagePart): part is MessagePart & { text: string } =>
  part.type === "text" && typeof part.text === "string";

/** Join the text parts of the latest assistant message; `""` when there is none. */
export const extractLatestAssistantText = (messages: readonly MessageWithParts[]): string => {
  const assistant = messages.filter((message) => message.info.role === "assistant");
  if (assistant.length === 0) return "";
  const latest = assistant.reduce((best, candidate) =>
    createdAt(candidate) >= createdAt(best) ? candidate : best
  );
  return latest.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join("")
    .trim();
};
