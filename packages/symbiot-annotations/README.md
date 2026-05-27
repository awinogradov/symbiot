# @symbiot/annotations

Annotation data model + codec. The walker traverses a PlateJS value, surfaces
every anchored annotation plus app-level global comments, and the serializer
emits feedback markdown that the agent reads. Encode/decode handle the
compact tuple wire format used for sharing.

## Annotation types

| Type           | Trigger                           | Compact tuple                                            | Exported markdown form                                                        |
| -------------- | --------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Comment        | Select span → Comment             | `['C', originalText, text, author?, images?]`            | `Feedback on: "<originalText>"` + quoted comment                              |
| Global Comment | Top-bar action, no selection      | `['G', text, author?, images?]`                          | Dedicated `General feedback` section                                          |
| Deletion       | Select span → Delete (or Redline) | `['D', originalText, author?, images?]`                  | `Suggest deleting: "<originalText>"`                                          |
| Insertion      | Select anchor → Insert → text     | `['I', contextText, newText, author?, images?]`          | `Insert after: "<contextText>"` + `> <newText>`                               |
| Replacement    | Select span → Replace → text      | `['R', originalText, replacementText, author?, images?]` | `Suggest replacing: "<originalText>"` + `> Replace with: "<replacementText>"` |

## Architecture

```
PlateJS value
    │
    ▼
walkAnnotations()           ──▶  AnnotationEntry[]
    │  (per-anchor + global)         │
    │                                ▼
    │                          serializeFeedback() ──▶ feedback markdown
    │                                                 (byte-pinned by fixtures/golden/)
    │
    ▼
encodeAnnotations()         ──▶  AnnotationTuple[]   ──▶ share URL hash
                                  │
decodeAnnotations()         ◀─────┘                      (lossless round-trip)
    │
    ▼
dualAnchor.resolveAnchor()  ──▶  re-attaches anchors against current PlateJS value
                                  (path/offset + originalText text-quote fallback)
```

Anchors are stored as Plate paths/offsets _plus_ an `originalText` snapshot.
On load, anchors resolve against the live tree; if the tree shifted (a
revised plan version), the codec falls back to text-quote matching on
`originalText`, so annotations survive version changes.

## Installation

Workspace dependency — referenced as `"@symbiot/annotations": "workspace:*"`
from other packages.

## Usage

```ts
import {
  walkAnnotations,
  serializeFeedback,
  encodeAnnotations,
  decodeAnnotations,
} from "@symbiot/annotations";

const entries = walkAnnotations({
  value: editorValue,
  commentBodies,
  commentImages,
  globalComments,
});

const feedback = serializeFeedback(entries); // → markdown for /api/feedback or /api/deny
const tuples = encodeAnnotations(entries); // → compact form for sharing
```

## Local development

```sh
bun run typecheck
bun run lint
bun run test
```

Byte-equality regression fixtures live in
[`../../fixtures/golden/`](../../fixtures/golden/README.md). To change the
serializer output deliberately, copy the actual output back into the
relevant fixture and commit the two changes together.

## Documentation

- [`docs/server-contract.md`](../../docs/server-contract.md) — where feedback markdown is consumed.
- [`docs/version-history.md`](../../docs/version-history.md) — drift detection across versions.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
