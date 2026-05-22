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

import { DiffPlugin } from "./diffPlugin.ts";
import { SourceLinesPlugin } from "./sourceLines.ts";

const MarkdownWithGfm = MarkdownPlugin.configure({
  options: { remarkPlugins: [remarkGfm] },
});

/**
 * Shared markdown surface used by every editor mode. Read-only diff and
 * read-write review editors render the same prose tokens (paragraphs, tables,
 * lists, code blocks, void elements), so the shared base lives once here and
 * the per-mode appendices are layered on top in {@link SymbiotEditorKit} /
 * {@link SymbiotDiffKit}.
 *
 * `HorizontalRulePlugin` ships with `render: { as: "hr" }`, which React 19
 * rejects because Slate-React always passes a zero-width text node as
 * children — `<hr>` is a void element that can't host children. Override with
 * a wrapper component (`HrElement`) that keeps the Slate children hidden.
 *
 * `ParagraphPlugin` ships without a `render` config, so paragraph nodes fall
 * through to the default `<div>` — breaking semantic HTML and any `.prose p`
 * selector that depends on it. Configure it to render as `<p>`.
 */
const symbiotBaseKit = [
  MarkdownWithGfm,
  SourceLinesPlugin,
  BasicBlocksPlugin,
  ParagraphPlugin.configure({ render: { as: "p" } }),
  BasicMarksPlugin,
  HorizontalRulePlugin.withComponent(HrElement),
  CodeBlockPlugin.withComponent(CodeBlockElement),
  ListPlugin,
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
  ImagePlugin.withComponent(VoidImage),
];

/**
 * Plate plugin composition for the editable review editor. Appends the
 * annotation-authoring leaf plugins (suggestion / insertion / replacement) and
 * the comment plugin so reviewer marks render alongside markdown.
 */
export const SymbiotEditorKit = [
  ...symbiotBaseKit,
  SuggestionMarkPlugin,
  InsertionMarkPlugin,
  ReplacementMarkPlugin,
  CommentPlugin.withComponent(CommentLeaf),
];

/**
 * Plate plugin composition for the read-only diff viewer. Mirrors
 * {@link SymbiotEditorKit} for the markdown surface but omits the
 * annotation-authoring plugins — diff mode is read-only and the suggestion /
 * comment plugins share leaf-key space with the diff renderer. `DiffPlugin` is
 * appended last so its leaf renderer wins on any leaf carrying `leaf.diff`.
 */
export const SymbiotDiffKit = [...symbiotBaseKit, DiffPlugin];
