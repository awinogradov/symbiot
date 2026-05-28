import type { ReactNode } from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: { type: HeadingTag };
}

/**
 * Renderer for Plate heading nodes. `element.type` is `h1`..`h6`; the component
 * renders the matching HTML heading tag and stamps a level-specific testid
 * (`editor-heading-1`..`editor-heading-6`) so BDD specs can select headings
 * without falling back to the `h${level}` tag pattern banned by
 * `docs/testing.md#playwright-bdd-selectors`. Plate's `H1Plugin`..`H6Plugin`
 * each register this component via `.withComponent(HeadingElement)` in
 * `utils/kit.ts`.
 */
export const HeadingElement = ({
  attributes,
  children,
  element,
}: HeadingElementProps): React.ReactElement => {
  const Tag = element.type;
  return (
    <Tag {...attributes} data-testid={`editor-heading-${Tag.slice(1)}`}>
      {children}
    </Tag>
  );
};
