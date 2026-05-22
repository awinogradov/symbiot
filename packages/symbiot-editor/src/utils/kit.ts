import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import { CommentPlugin } from "@platejs/comment/react";
import { ListPlugin } from "@platejs/list/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { ImagePlugin } from "@platejs/media/react";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { ParagraphPlugin } from "platejs/react";
import remarkGfm from "remark-gfm";

import { CodeBlockElement } from "../components/CodeBlockElement.tsx";
import { CommentLeaf } from "../components/CommentLeaf.tsx";
import { SuggestionMarkPlugin } from "../components/DeletionLeaf.tsx";
import { InsertionMarkPlugin } from "../components/InsertionLeaf.tsx";
import { ReplacementMarkPlugin } from "../components/ReplacementLeaf.tsx";
import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from "../components/TableElements.tsx";
import { HrElement } from "../components/VoidElements.tsx";
import { VoidImage } from "../components/VoidImage.tsx";

import { SourceLinesPlugin } from "./sourceLines.ts";

const MarkdownWithGfm = MarkdownPlugin.configure({
  options: { remarkPlugins: [remarkGfm] },
});

/**
 * Plate plugin composition for symbiot's read-only review editor.
 *
 * Phase 3.1 wires the full FR-1.2 markdown surface:
 *  - `remark-gfm` for tables / strikethrough / task lists at parse time
 *  - explicit `Table*Element` components so mdast `table` nodes render as
 *    semantic `<table>` instead of falling through to a `<div>` wrapper
 *  - `SourceLinesPlugin` exposing `editor.api.sourceLines.getBlockLines(path)`
 *    so `walkAnnotations` can attach `BlockLines` to per-anchor entries and
 *    `serializeFeedback` can emit the `(lines N–M)` prefix
 *  - `CodeBlockElement` with Shiki dual-themed highlighting on fenced code
 *  - `DeletionLeaf` so suggestion marks render with strikethrough (3.2)
 *
 * `HorizontalRulePlugin` ships with `render: { as: "hr" }`, which React 19
 * rejects because Slate-React always passes a zero-width text node as
 * children — `<hr>` is a void element that can't host children. Override
 * with a wrapper component that keeps the Slate children hidden.
 *
 * `ParagraphPlugin` ships without a `render` config, so paragraph nodes
 * fall through to the default `<div>` element — breaking semantic HTML and
 * any `.prose p` / `p code` selector that depends on it. Configure it to
 * render as `<p>`.
 */
export const SymbiotEditorKit = [
  MarkdownWithGfm,
  SourceLinesPlugin,
  BasicBlocksPlugin,
  ParagraphPlugin.configure({ render: { as: "p" } }),
  BasicMarksPlugin,
  SuggestionMarkPlugin,
  InsertionMarkPlugin,
  ReplacementMarkPlugin,
  HorizontalRulePlugin.withComponent(HrElement),
  CodeBlockPlugin.withComponent(CodeBlockElement),
  ListPlugin,
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
  ImagePlugin.withComponent(VoidImage),
  CommentPlugin.withComponent(CommentLeaf),
];
