# @symbiot/editor

The symbiot Plate editor as a reusable React package. Renders markdown as a
PlateJS value, lets the reviewer drop Comment / Deletion / Insertion /
Replacement marks via a floating selection toolbar, and exposes a parallel
read-only diff editor for plan-version comparison.

Embedded in the browser surface that `apps/viewer` and `apps/portal` mount.

## Architecture

```
ReviewEditor                          DiffEditor
  ├─ SymbiotEditorKit                   ├─ SymbiotDiffKit
  │   ├─ MarkdownKit                    │   ├─ MarkdownKit (no annotations)
  │   ├─ CommentPlugin                  │   └─ DiffPlugin  (key "diff")
  │   ├─ SuggestionMarkPlugin           │
  │   ├─ InsertionMarkPlugin            └─▶ @platejs/diff computeDiff()
  │   ├─ ReplacementMarkPlugin              renders insertions / deletions /
  │   └─ SourceLinesPlugin                  updates as visual marks
  │
  ├─ applyAnnotation(editor, kind)        Diff nodes are keyed distinctly
  │   uses editor.tf.* transforms         from authored suggestions, so
  │   (bypasses contenteditable=false)    they can never be "accepted" as
  │                                       feedback by mistake.
  └─ useTypingGuard                       Both editors share the same
      blocks beforeinput / paste etc.     `--anno-*` token palette, so
      at capture phase                    diff and annotated marks have
                                          a single visual language.
```

### Why a separate package

Kept distinct from `@symbiot/ui` on purpose:

- **Dependency surface.** `@symbiot/ui` is design-system only (Radix + Tailwind + `cva`/`cn`). The editor pulls in Plate, slate, shiki, remark, and `@symbiot/annotations` — folding it in would force every UI consumer to carry the Plate runtime.
- **Layered direction.** `apps/viewer` → `@symbiot/editor` → `@symbiot/ui`. One-way arrow; the editor consumes ui primitives, not the other way around.
- **Change cadence.** UI evolves with design tokens; editor evolves with the review/redline domain (suggestions, comments, markdown plugins). Separation lets each move independently.
- **Reusability.** Other surfaces (settings panels, future apps) can depend on `@symbiot/ui` without inheriting the editor stack.

### Architectural specials

Things that look fine on a refactor but break if you change them — full list
in [`../../docs/02-architecture.md`](../../docs/02-architecture.md):

- `aboveNodes` render hooks return `children` for non-diff elements, not `undefined` — Plate drops the entire element otherwise.
- The host re-keys `DiffEditor` on `mode` change so `usePlateEditor` builds a fresh editor with the right initial value. Mixing `usePlateEditor`'s `deps` array with conditional value computation produces stale renders.
- The editor stays mounted as `<Plate readOnly>` for the entire session. Annotation transforms run via `editor.tf.*`, which bypass DOM `contenteditable=false` entirely. No transient readOnly toggling.

## Installation

Workspace dependency — referenced as `"@symbiot/editor": "workspace:*"`
from `apps/viewer` and `apps/portal`.

## Usage

```tsx
import { ReviewEditor } from "@symbiot/editor";

<ReviewEditor
  markdown={plan}
  onChange={(snapshot) => setEditorSnapshot(snapshot)}
  onReady={(handle) => (editorHandleRef.current = handle)}
/>;
```

The handle exposes the imperative `applyAnnotation` API and getters for
the annotation sidecar maps that `serializeFeedback` consumes.

## Local development

```sh
bun run typecheck
bun run lint
bun run test
```

## Documentation

- [`docs/02-architecture.md`](../../docs/02-architecture.md) — package layering and the editor's place in the monorepo.
- [`docs/04-version-history.md`](../../docs/04-version-history.md) — diff editor and the inline-diff overlay pipeline.

## License

MIT — see the root [`LICENSE.md`](../../LICENSE.md).
