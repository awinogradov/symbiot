# Plan fixtures

Markdown plans used by the Playwright-BDD harness and for manual smoke tests
of the viewer.

| File                    | Purpose                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `elements.md`           | Default fixture — exercises every supported markdown element in one pass. |
| `elements-revised.md`   | Same H1 (and therefore same plan slug) as `elements.md`, with intentional changes so the Phase 4.2 inline diff has insertions, a deletion, and an inline word replacement to surface. |

## Manual diff smoke (Phase 4.2)

Every viewer boot writes the supplied plan to a fresh version under
`~/.symbiot/history/<project>/<slug>/00N.md`. Two boots with the same markdown
produce identical adjacent versions, so the inline diff stays empty by design.

Phase 4.2 only renders the inline diff for **historical** versions — the
newest (boot) version stays in editable mode so annotation authoring keeps
working. That means a two-boot flow where the revision lands as the current
version does not surface a diff: you'd be looking at the revision in editable
mode, with no way to flip into the diff view of "what just changed".

The reliable smoke is **three boots**, ending on the baseline so the revision
sits one slot back in history:

```bash
# Boot 1 — write baseline as version N.
bun apps/viewer/src/bin.ts --plan fixtures/plans/elements.md \
  --no-open --keep-alive --port 3210
# Ctrl-C

# Boot 2 — write the revision as version N+1.
bun apps/viewer/src/bin.ts --plan fixtures/plans/elements-revised.md \
  --no-open --keep-alive --port 3210
# Ctrl-C

# Boot 3 — write baseline as version N+2 (current). Now the revision is
# version N+1, sitting in history with N as its predecessor.
bun apps/viewer/src/bin.ts --plan fixtures/plans/elements.md \
  --no-open --keep-alive --port 3210
```

Open <http://127.0.0.1:3210>, switch the right-hand sidebar to **History**,
and click the **revised** row (the second-newest version — one slot below
`current`). The editor switches to the read-only `DiffEditor`, the Clean /
Raw toggle appears above the version list, and the diff renders with
insertions in green, deletions in red (strikethrough), and inline updates in
amber.

Both fixtures share the H1 `# Example plan with every supported markdown
element`, which `deriveProjectSlug` / `derivePlanSlug` use to produce the
same on-disk slug. New fixtures intended for the same smoke loop must keep
that H1 verbatim.

Surfacing the diff of the **current** version against its predecessor — the
most common review case (“what changed in this newest revision?”) — is
Phase 4.3 work: today, viewing that diff requires putting another version on
top, as above.
