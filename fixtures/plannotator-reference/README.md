# plannotator wire-format reference fixtures

Golden-file fixtures that pin symbiot's feedback markdown to plannotator's
output (M2 byte-equality, PRD §13). The format was reverse-engineered from
[`packages/ui/utils/parser.ts::exportAnnotations`](https://github.com/backnotprop/plannotator/blob/main/packages/ui/utils/parser.ts)
at commit `82636e1` on `main`, fetched 2026-05-19.

## comment.md

The serialization of a single `COMMENT` annotation against
`fixtures/plans/elements.md`:

- selection: `the quick brown fox` (in the first body paragraph)
- comment body: `Should this be a wolf?`

The plannotator source emits an optional `(lines N–M)` prefix in the heading
when the annotation's block has a resolvable source-line range. This fixture
was captured before symbiot's `SourceLinesPlugin` shipped, so the line label is
absent. Once a real plannotator session is captured against the same input,
the fixture should be replaced with that capture (which will include the line
label) — see TODO below.

## global-comment.md, deletion.md, mixed.md

Synthesized from symbiot's own `serializeFeedback` against canonical inputs:

- `global-comment.md` — one `['G', 'overall this looks great']` entry.
- `deletion.md` — one `['D', 'redundant clause']` entry.
- `mixed.md` — `C` + `D` + `G` together, in that order, with the same canonical
  bodies as the single-kind fixtures.

These are self-referential pins: they assert the serializer's output is stable.
They do **not** independently verify plannotator parity for `G` / `D`. The next
step is to capture all four (`comment.md`, `global-comment.md`, `deletion.md`,
`mixed.md`) from a real plannotator session and swap them in here.

<!-- TODO(post-3.1): replace synthesized G/D/mixed fixtures with real plannotator
captures. See plans/03-1-wire-format-and-markdown.md follow-ups. -->

