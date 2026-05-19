import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import { CommentPlugin } from "@platejs/comment/react";
import { MarkdownPlugin } from "@platejs/markdown";

import { HrElement } from "./voidElements.tsx";

/**
 * Plate plugin composition for symbiot's read-only review editor. Phase 2
 * scope: markdown render + fenced code + anchored Comment mark. Phases 3-5
 * extend with SuggestionPlugin, MediaImagePlugin, etc.
 *
 * `HorizontalRulePlugin` ships with `render: { as: "hr" }`, which React 19
 * rejects because Slate-React always passes a zero-width text node as
 * children — `<hr>` is a void element that can't host children. Override
 * with a wrapper component that keeps the Slate children hidden.
 */
export const SymbiotEditorKit = [
  MarkdownPlugin,
  BasicBlocksPlugin,
  BasicMarksPlugin,
  HorizontalRulePlugin.withComponent(HrElement),
  CodeBlockPlugin,
  CommentPlugin,
];
