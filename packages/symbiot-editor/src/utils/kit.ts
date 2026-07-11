import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import { CodeBlockPlugin, CodeLinePlugin } from "@platejs/code-block/react";
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
import { CodeLineElement } from "../components/CodeLineElement.tsx";
import { CodeSyntaxLeafPlugin } from "../components/CodeSyntaxLeaf.tsx";
import { CommentLeaf } from "../components/CommentLeaf.tsx";
import { SuggestionMarkPlugin } from "../components/DeletionLeaf.tsx";
import { HeadingElement } from "../components/HeadingElement.tsx";
import { InlineCodeLeaf } from "../components/InlineCodeLeaf.tsx";
import { InsertionMarkPlugin } from "../components/InsertionLeaf.tsx";
import { ListElement } from "../components/ListElement.tsx";
import { ParagraphElement } from "../components/ParagraphElement.tsx";
import { ReplacementMarkPlugin } from "../components/ReplacementLeaf.tsx";
import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from "../components/TableElements.tsx";
import { HrElement } from "../components/VoidElements.tsx";
import { VoidImage } from "../components/VoidImage.tsx";

import { CodeSyntaxPlugin } from "./codeSyntax.ts";
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
 * {@link SymbiotDiffKit} / {@link SymbiotDraftKit}.
 *
 * `HorizontalRulePlugin` ships with `render: { as: "hr" }`, which React 19
 * rejects because Slate-React always passes a zero-width text node as
 * children — `<hr>` is a void element that can't host children. Override with
 * a wrapper component (`HrElement`) that keeps the Slate children hidden.
 *
 * `ParagraphPlugin` ships without a `render` config, so paragraph nodes fall
 * through to the default `<div>` — breaking semantic HTML and any `.prose p`
 * selector that depends on it. Wrap it with `ParagraphElement` so paragraphs
 * render as `<p>` AND expose `data-testid="editor-paragraph"` for the
 * Playwright-BDD selector rule (`docs/08-testing.md#playwright-bdd-selectors`).
 *
 * `H1Plugin`..`H6Plugin`, `ListPlugin`, and `CodePlugin` (inline) are
 * registered AFTER `BasicBlocksPlugin` / `BasicMarksPlugin` so the explicit
 * `.withComponent` overrides win over the meta-plugins' defaults — each adds
 * the `data-testid` BDD specs select on (`editor-heading-N`, `editor-list`,
 * `editor-code-inline`).
 */
const symbiotBaseKit = [
  MarkdownWithGfm,
  SourceLinesPlugin,
  BasicBlocksPlugin,
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.withComponent(HeadingElement),
  H2Plugin.withComponent(HeadingElement),
  H3Plugin.withComponent(HeadingElement),
  H4Plugin.withComponent(HeadingElement),
  H5Plugin.withComponent(HeadingElement),
  H6Plugin.withComponent(HeadingElement),
  BasicMarksPlugin,
  CodePlugin.withComponent(InlineCodeLeaf),
  HorizontalRulePlugin.withComponent(HrElement),
  CodeBlockPlugin.withComponent(CodeBlockElement),
  CodeLinePlugin.withComponent(CodeLineElement),
  CodeSyntaxLeafPlugin,
  CodeSyntaxPlugin,
  ListPlugin.configure({
    render: {
      belowNodes: ({ element }) => (element.listStyleType ? ListElement : undefined),
    },
  }),
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

/**
 * Plate plugin composition for the editable draft editor (`draft` viewer
 * mode). The bare shared markdown surface: no annotation-authoring plugins
 * (drafting is free-text typing, not review marks) and no `DiffPlugin`
 * (revision diffs render in the separate read-only diff viewer).
 */
export const SymbiotDraftKit = [...symbiotBaseKit];
