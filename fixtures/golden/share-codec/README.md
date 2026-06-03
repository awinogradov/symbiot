# Share codec golden fixtures

Backward-compatibility regression fixtures for the share codec in
[`packages/symbiot-annotations`](../../../packages/symbiot-annotations/README.md).
Each fixture pins a known-good `encoded` string against the `decoded`
`SymbiotDocument` it must produce, so any change that breaks decoder
compatibility fails the test suite immediately.

These fixtures pin the **decoder**, not the encoder. The on-wire bytes of
`deflate-raw` are implementation-defined and may shift across Node, Bun, or
zlib versions; what matters for wire-format stability is that any historically
valid encoded string still deserializes to the same document.

## Fixtures

| File              | What it pins                                                         |
| ----------------- | -------------------------------------------------------------------- |
| `comment.json`    | Single `C` annotation in the document.                               |
| `global.json`     | Single `G` annotation plus its mirror in `globalComments`.           |
| `deletion.json`   | Single `D` annotation.                                               |
| `insertion.json`  | Single `I` annotation (`contextText` + `newText`).                   |
| `replacement.json`| Single `R` annotation (`originalText` + `replacementText`).          |
| `mixed.json`      | All five tuple kinds + author + images on the C and G entries.       |

Each file is `{ encoded: <base64url string>, decoded: <SymbiotDocument> }`.
The test asserts `deserialize(encoded)` deep-equals `decoded`.

## Updating fixtures

A change to `SymbiotDocument` shape is a breaking change for the wire format.
Add **new** fixtures for the new shape; never edit the existing ones, since
their purpose is to prove old encoded strings still decode. Drop a fixture
only when its decoded shape is no longer legal under the current schema, and
land that drop in the same PR that introduces the schema change.

## How they're used

`packages/symbiot-annotations/src/share.test.ts` walks every JSON file under
this directory and asserts `deserialize(encoded)` matches `decoded`. The
encoder is exercised by the fuzz suite in the same file; the goldens guard
the decoder.

## CI gate

These fixtures are enforced in CI by the unit-coverage gate — see
[Golden-fixture gate](../../../docs/testing.md#golden-fixture-gate) in `docs/testing.md`.
