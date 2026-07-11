---
name: draft
description: Author a plan draft in the symbiot viewer and iterate with the agent until approval. Use when the user wants to write or co-author a plan themselves before any code is written. Optional argument - a markdown file to seed the draft (e.g. /draft notes/plan.md); omit it to start from a blank document.
---

# Draft a plan in the viewer

The user writes a plan in an editable symbiot viewer; you refine each revision they send; on Approve you implement the agreed plan. The viewer session is one-shot — every iteration is one CLI run that blocks until the user acts. The normative marker and exit-code contract lives in [docs/03-server-contract.md](../../../../docs/03-server-contract.md) (section "Draft loop contract").

## Loop

1. Run the draft CLI via Bash. Pass the user's file argument when one was given, otherwise no file (blank draft):

   ```bash
   ${CLAUDE_PLUGIN_ROOT}/bin/symbiot draft [file.md]
   ```

   The command blocks while the user writes in the viewer — run it in the background if available, otherwise use the maximum Bash timeout. Do not treat a long-running command as a failure.

2. When it exits, parse **only the first line of stdout that starts with `SYMBIOT_DRAFT_`** — plan bodies can legally contain the marker words, so never scan beyond the first marker line:
   - `SYMBIOT_DRAFT_REVISION <path>` (exit 0) — the user sent you a revision. The second stdout line echoes the exact re-run form including `--slug <slug>`; keep that slug.
   - `SYMBIOT_DRAFT_APPROVED <path>` (exit 0) — the plan is agreed. Go to step 5.
   - `SYMBIOT_DRAFT_CANCELLED` (exit 2) — the user closed the review without an outcome. Stop without error; do not retry.

3. On a revision: read the markdown at `<path>` (a persisted version file under `~/.symbiot` — never edit it in place), refine it, and write the refined markdown to a NEW file (e.g. under the session scratchpad). Keep the document's H1 unchanged as hygiene — continuity is carried by `--slug`, but a stable title keeps the history readable.

4. Re-run with the refined file and the slug from step 2, then go back to step 2:

   ```bash
   ${CLAUDE_PLUGIN_ROOT}/bin/symbiot draft <refined.md> --slug <slug>
   ```

   The viewer reopens leading with the inline diff between the previous revision and yours; the user clicks "Back to editing" to continue writing, sends another revision, or approves.

5. On approval: read the markdown at the approved `<path>` — that file IS the agreed plan. Implement it step by step, exactly as written. Do not re-plan or expand its scope.

## Notes

- Never run raw `symbiot-viewer` or POST to the viewer's HTTP API yourself — the CLI owns the session lifecycle.
- Exit code 1 means an unexpected resolution (not part of the draft contract); surface it to the user instead of retrying.
