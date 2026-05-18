# @symbiot/annotations

Annotation data model + codec. The 5 annotation tuple types per PRD §15:

| Type           | Tuple                                                    | Phase |
| -------------- | -------------------------------------------------------- | ----- |
| Comment        | `['C', originalText, text, author?, images?]`            | 2     |
| Global Comment | `['G', text, author?, images?]`                          | 3     |
| Deletion       | `['D', originalText, author?, images?]`                  | 3     |
| Insertion      | `['I', contextText, newText, author?, images?]`          | 5     |
| Replacement    | `['R', originalText, replacementText, author?, images?]` | 5     |

Anchor strategy: dual (Plate path/offset + originalText fallback) per PRD §8.5 / R-2.

## Status

Placeholder. Phased rollout as above. Currently exports nothing.

## Scripts

- `bun run typecheck`
- `bun run lint`
- `bun run test`
