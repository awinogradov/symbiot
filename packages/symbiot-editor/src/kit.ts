import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import { CommentPlugin } from "@platejs/comment/react";
import { ListPlugin } from "@platejs/list/react";
import { MarkdownPlugin } from "@platejs/markdown";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import remarkGfm from "remark-gfm";

import { HrElement } from "./voidElements.tsx";

const MarkdownWithGfm = MarkdownPlugin.configure({
  options: { remarkPlugins: [remarkGfm] },
});

/**
 * Plate plugin composition for symbiot's read-only review editor.
 *
 * Phase 3.1 expands the FR-1.2 markdown surface: tables (@platejs/table) and
 * bullet / ordered / task lists (@platejs/list) join the kit so the markdown
 * deserializer recognises them. CodeBlockPlugin will get Shiki integration in
 * a follow-up Phase 3.1 task; for now it renders text-only as in Phase 2.
 *
 * `HorizontalRulePlugin` ships with `render: { as: "hr" }`, which React 19
 * rejects because Slate-React always passes a zero-width text node as
 * children — `<hr>` is a void element that can't host children. Override
 * with a wrapper component that keeps the Slate children hidden.
 */
export const SymbiotEditorKit = [
  MarkdownWithGfm,
  BasicBlocksPlugin,
  BasicMarksPlugin,
  HorizontalRulePlugin.withComponent(HrElement),
  CodeBlockPlugin,
  ListPlugin,
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
  CommentPlugin,
];
