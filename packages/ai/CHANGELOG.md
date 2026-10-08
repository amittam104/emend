# @emend/ai

## 0.1.2

- Support Tiptap 3.7.1 or later instead of requiring exactly 3.31.4.

## 0.1.1

Documentation release. No runtime changes.

- Simplify the package README and add a header image.
- Shorten the package description.
- Show the published install command.

## 0.1.0

Initial preview, published to npm.

- Provider-neutral controller, immutable proposals, and streaming transports.
- Tiptap capture, Markdown preparation, inline preview, stale-content protection,
  explicit Accept/Reject, and isolated undo.
- React `useEditorAi` session and Web Platform server helpers.
- Eight ESM entry points with TypeScript declarations.
- Exact aligned Tiptap `3.31.4` peers; React 19 is optional for non-React consumers.

UI components and provider recipes are distributed separately as editable
Shadcn registry source. Validation is manual and build-based; no automated
regression suite is included.
