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
when the annotation's block has a resolvable source-line range. Phase 2 does
not yet carry block-level source-line metadata through the Plate value, so the
line label is intentionally absent from this fixture. Phase 3 (which adds the
full annotation pipeline including block-line tracking) will tighten this
golden file to include the line label and add the remaining two
plannotator-compatible types (`['G', …]` and `['D', …]`).
