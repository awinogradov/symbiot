// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CommentLeaf } from "./CommentLeaf.tsx";
import { DeletionLeaf } from "./DeletionLeaf.tsx";
import { InsertionLeaf } from "./InsertionLeaf.tsx";
import { ReplacementLeaf } from "./ReplacementLeaf.tsx";

interface LeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

interface LeafCase {
  name: string;
  Leaf: FC<LeafProps>;
  tag: "mark" | "s" | "ins";
  /** Class tokens that must all appear on the rendered element. */
  expectedClassTokens: string[];
}

const cases: LeafCase[] = [
  {
    name: "CommentLeaf",
    Leaf: CommentLeaf,
    tag: "mark",
    expectedClassTokens: ["text-anno-comment", "bg-anno-comment/10"],
  },
  {
    name: "DeletionLeaf",
    Leaf: DeletionLeaf,
    tag: "s",
    expectedClassTokens: ["text-anno-delete", "line-through"],
  },
  {
    name: "InsertionLeaf",
    Leaf: InsertionLeaf,
    tag: "ins",
    expectedClassTokens: ["text-anno-insert", "no-underline"],
  },
  {
    name: "ReplacementLeaf",
    Leaf: ReplacementLeaf,
    tag: "mark",
    expectedClassTokens: ["text-anno-replace"],
  },
];

describe("annotation leaf components built via createAnnotationLeaf", () => {
  it.each(cases)(
    "$name renders as <$tag> with the kind-specific palette class tokens",
    ({ Leaf, tag, expectedClassTokens }) => {
      const { container } = render(<Leaf attributes={{}}>x</Leaf>);
      const el = container.querySelector(tag);
      if (el === null) throw new Error(`expected <${tag}>, got: ${container.innerHTML}`);
      for (const token of expectedClassTokens) expect(el.className).toContain(token);
    }
  );
});
