# Example plan with every supported markdown element

This fixture exercises the FR-1.2 supported-markdown subset so the Plate
renderer can be smoke-tested in one pass.

## Headings & inline marks

The quick brown fox jumps over the lazy dog. This paragraph contains **bold
text**, _italic text_, ~~strikethrough~~, and `inline code`. It also links to
[symbiot](https://example.invalid).

## Unordered list

- First item
- Second item with a nested item
  - Nested item one
  - Nested item two
- Third item

## Ordered list

1. Step one
2. Step two
3. Step three

## Task list

- [ ] Open task
- [x] Completed task
- [ ] Another open task

## Blockquote

> Plans should be reviewable as prose, not as patches.

## Fenced code block

```ts
const greeting = (name: string): string => `hello, ${name}`;
```

## Table

| Annotation | Tuple key | Phase |
| ---------- | --------- | ----- |
| Comment    | C         | 2     |
| Deletion   | D         | 3     |
| Insertion  | I         | 5     |

## Horizontal rule

---

Final paragraph to make the fixture wrap a horizontal rule.
