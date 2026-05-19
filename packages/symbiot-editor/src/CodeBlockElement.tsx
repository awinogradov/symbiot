import { useEffect, useMemo, useState, type ReactNode } from "react";

import { highlightToHtml } from "./shiki.ts";

interface CodeLineNode {
  children?: { text?: string }[];
}

interface CodeBlockNode {
  lang?: string;
  children?: CodeLineNode[];
}

interface CodeBlockElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: CodeBlockNode;
}

const extractCode = (element: CodeBlockNode): string => {
  if (element.children === undefined) return "";
  return element.children
    .map((line) => (line.children ?? []).map((leaf) => leaf.text ?? "").join(""))
    .join("\n");
};

/**
 * Read-only renderer for `code_block` Plate elements. Extracts the code from
 * `code_line` children, hands it to Shiki for dual-themed HTML, and renders
 * `dangerouslySetInnerHTML` (safe — input is the user's own plan, never crossed
 * a network boundary). Slate's children stay in a hidden span so the editor
 * data model is intact even though the visible DOM is the Shiki output.
 */
export const CodeBlockElement = ({
  attributes,
  children,
  element,
}: CodeBlockElementProps): React.ReactElement => {
  const code = useMemo(() => extractCode(element), [element]);
  const lang = element.lang ?? "text";
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    highlightToHtml(code, lang)
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return (): void => {
      cancelled = true;
    };
  }, [code, lang]);

  if (html === null) {
    return (
      <div {...attributes} contentEditable={false} data-testid="code-block" data-lang={lang}>
        <pre className="border-border bg-muted overflow-x-auto rounded-md border p-3 text-sm">
          <code>{code}</code>
        </pre>
        <span className="hidden">{children}</span>
      </div>
    );
  }

  return (
    <div {...attributes} contentEditable={false} data-testid="code-block" data-lang={lang}>
      {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- Shiki output of the reviewer's own plan; never crosses a network boundary. */}
      <div className="symbiot-shiki" dangerouslySetInnerHTML={{ __html: html }} />
      <span className="hidden">{children}</span>
    </div>
  );
};
