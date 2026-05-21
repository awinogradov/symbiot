import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
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
 * Plugin composition for the read-only diff viewer. Mirrors `SymbiotEditorKit`
 * for the markdown surface but omits the annotation-authoring plugins
 * (`SuggestionMarkPlugin`, `CommentPlugin`) — diff mode has no need to render
 * reviewer marks and removing them keeps the diff leaf rendering as the only
 * styled overlay. `DiffPlugin` is appended last so its leaf renderer wins on
 * any leaf carrying `leaf.diff === true`.
 */
export const SymbiotDiffKit = [
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
  DiffPlugin,
];
