# Preview release validation

Checked on 2026-10-02 for `@emend/ai` 0.1.0 with Tiptap 3.31.4.

## Passed

- Frozen workspace installation, lint, typecheck, website build, registry build,
  and `git diff --check`.
- Packed npm contents and all eight runtime imports. The package includes its
  declarations, license, README, changelog, and dependency notices.
- Both standalone consumer fixtures installed the packed runtime and passed
  typecheck/build. Workspace and fixture peer checks reported no conflicts.
- Shadcn installed today's registry source into both fixtures. The unpublished
  runtime dependency was substituted with the local tarball in a temporary
  registry; the public manifest retains `@emend/ai@0.1.0`.
- Existing-editor browser: informational Ask, inline preview without document
  mutation, Reject, Regenerate, plain-text Apply, and exact document restoration
  through Undo.
- Editor-starter browser: Bubble Menu proposal, stale-target rejection, Composer
  rich-text preview/Accept/Undo with neighboring blocks and marks preserved,
  Assistant Ask without mutation, saved history, and reopening the Assistant.
- Assistant layout at 390px in dark mode stayed inside the viewport after layout
  settled. Desktop/light mode was also inspected.
- Packed runtime checks: selection/block/document scopes, Stop and Retry,
  provider-error recovery, stale Retry, fresh Regenerate, and rejection of
  malformed or mismatched SSE. These were transient checks; no tests were added.
- Signed-in npm organization: `amittam104` is an owner of `emend`, with 2FA.

## Before publication

- Complete the remaining manual cases from `RELEASING.md`, especially editable
  drafts, unsupported content, whole-document confirmation, and keyboard-only
  operation across the AI surfaces. The checks above are not a complete behavior
  matrix.
- Pass PR review and CI, merge, then verify the deployed registry payloads.
- Authenticate the npm terminal and explicitly approve publication. npm browser
  login alone does not authenticate the CLI.
- After publishing, repeat both installation paths against the production
  registry and public npm package, then create the Git tag and GitHub prerelease.
- The live AI-provider path was not exercised by these consumer checks; their
  server transport uses the deterministic mock generator.

Nothing was published to npm or tagged as a release during this preparation.
