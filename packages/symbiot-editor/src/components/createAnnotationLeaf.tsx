import type { ElementType, ReactNode } from "react";

interface AnnotationLeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Build a stateless Plate leaf renderer that wraps `children` in the given HTML
 * tag with the given Tailwind class string. Used by `CommentLeaf`,
 * `DeletionLeaf`, `InsertionLeaf`, and `ReplacementLeaf` so the shared
 * `(attributes, children) → <tag className>` shape lives in one place. Leaves
 * with operation-aware rendering (e.g. `DiffLeaf`) opt out of the factory.
 *
 * `testId` stamps a `data-testid` on the rendered element so Playwright-BDD
 * specs can locate the highlight by kind (the suite forbids class/role
 * selectors — see `docs/08-testing.md#playwright-bdd-selectors`).
 *
 * @example
 *   export const CommentLeaf = createAnnotationLeaf(
 *     "mark",
 *     "text-anno-comment bg-anno-comment/10 rounded-sm px-0.5",
 *     "CommentLeaf",
 *     "annotation-comment",
 *   );
 */
export const createAnnotationLeaf = (
  tag: ElementType,
  className: string,
  displayName: string,
  testId: string
): React.FC<AnnotationLeafProps> => {
  const Tag = tag;
  const AnnotationLeaf = ({ attributes, children }: AnnotationLeafProps): React.ReactElement => (
    <Tag {...attributes} className={className} data-testid={testId}>
      {children}
    </Tag>
  );
  AnnotationLeaf.displayName = displayName;
  return AnnotationLeaf;
};
