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
resolveAnchor()             ──▶  re-attaches anchors against current PlateJS value
                                  (Plate path + originalText text-quote fallback)
```

Anchors are stored as a Plate path plus an `originalText` snapshot.
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

## Sharing

The share codec lets the viewer encode the full `SymbiotDocument` —
`{ markdown, value, annotations, globalComments, meta }` — into a
URL-hash-safe string so a reviewer can paste a session link and a teammate
can reconstruct the editor state without a server.

```ts
import {
  serialize,
  deserialize,
  encrypt,
  decrypt,
  isShareSupported,
  type SymbiotDocument,
} from "@symbiot/annotations";

// Compact (public) share
const hash = await serialize(doc); // → URL-hash-safe string
location.hash = `#d=${hash}`;
const back = await deserialize(hash);

// Encrypted (private) share — key lives in the URL fragment, never on the wire
const key = crypto.getRandomValues(new Uint8Array(32));
const envelope = await encrypt(doc, key); // → { ciphertext, iv }
const plain = await decrypt(envelope, key);
```

### When to use which

| Variant     | Wire shape                                  | Use when                                           |
| ----------- | ------------------------------------------- | -------------------------------------------------- |
| `serialize` | base64url over deflate-raw                  | Public links; smallest payload.                    |
| `encrypt`   | `{ ciphertext, iv }` base64url, AES-256-GCM | Private links; ~28 bytes overhead vs. `serialize`. |

### URL length

Browsers tolerate URL fragments up to roughly 2 KB before truncation becomes
risky. For documents that exceed that budget, route through the paste-service
(see issue #46) and keep only the key in the fragment.

### Runtime support

`isShareSupported()` returns `true` only when every primitive the codec needs
is present: `CompressionStream`, `DecompressionStream`, `crypto.subtle`, and
`crypto.getRandomValues`. Some sandboxed runtimes expose a subset; gate UI
affordances on this check.

### Error model

| Surface             | Throws on                                                               |
| ------------------- | ----------------------------------------------------------------------- |
| `deserialize`       | invalid base64url, decompression failure, invalid JSON, schema mismatch |
| `encrypt`/`decrypt` | non-32-byte key, AES-GCM auth-tag mismatch (wrong key or tampered)      |

Every throw is a plain `Error` with a descriptive message; cryptographic
failures surface as the WebCrypto `OperationError` from `crypto.subtle`.

### Wire-format stability

[`fixtures/golden/share-codec/`](../../fixtures/golden/share-codec/README.md)
pins the **decoder**: each fixture is `{ encoded, decoded }` and the test
asserts `deserialize(encoded)` deep-equals `decoded`. A change to
`SymbiotDocument` shape is a breaking change — add new fixtures rather than
editing existing ones.

## Documentation

- [`docs/03-server-contract.md`](../../docs/03-server-contract.md) — where feedback markdown is consumed.
- [`docs/04-version-history.md`](../../docs/04-version-history.md) — drift detection across versions.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
