# Golden fixtures

Byte-equality regression fixtures for the annotation serializer in
[`packages/symbiot-annotations`](../../packages/symbiot-annotations/README.md).
Every test that produces feedback markdown is pinned against the files here,
so any unintended change to the wire format breaks the suite immediately.

The five annotation tuples that the serializer emits are:

| Tuple        | What it serializes                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `['C', …]`   | Anchored comment.                                                                               |
| `['G', …]`   | Global, document-level comment.                                                                 |
| `['D', …]`   | Deletion (struck-through original text).                                                        |
| `['I', …]`   | Insertion (`Insert after: "<contextText>"`, body `> <newText>`).                                |
| `['R', …]`   | Replacement (`Suggest replacing: "<originalText>"`, body `> Replace with: "<replacementText>"`). |

See [`packages/symbiot-annotations/README.md`](../../packages/symbiot-annotations/README.md) for the full parity contract.

## Fixtures

- `comment.md` — single `C` against `fixtures/markdown/elements.md`. Selection
  `the quick brown fox` in the first body paragraph, comment body
  `Should this be a wolf?`. The serializer emits an optional `(lines N–M)`
  prefix in the heading when the source-line range is resolvable; this fixture
  was captured before `SourceLinesPlugin` shipped, so the line label is absent.
- `global-comment.md` — one `['G', 'overall this looks great']` entry.
- `deletion.md` — one `['D', 'redundant clause']` entry.
- `mixed.md` — `C` + `D` + `G` together, in that order, with the same canonical
  bodies as the single-kind fixtures.
- `insertion.md` — one `['I', 'the quick brown fox', 'jumps']` entry.
- `replacement.md` — one `['R', 'redundant clause', 'concise note']` entry.

## How they're used

`packages/symbiot-annotations/src/serializeFeedback.test.ts` walks each
fixture, deserializes the canonical input into the annotation model, runs the
serializer, and asserts byte-for-byte equality against the fixture file. To
update a fixture intentionally:

1. Change the serializer.
2. Run the failing test; copy the *actual* output back into the fixture.
3. Commit the fixture change alongside the serializer change so the diff
   makes the contract change explicit.
