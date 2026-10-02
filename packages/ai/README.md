<p align="center">
  <img alt="@emend/ai README Header" src="https://shieldcn.dev/header/glow.svg?title=%40emend%2Fai&amp;subtitle=Provider-Neutral+Human-in-the-Loop+AI+Editing+Runtime+for+Tiptap&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

## What is @emend/ai?

`@emend/ai` is a provider-neutral human-in-the-loop AI editing runtime for Tiptap.

## Status

`0.1.0` is the initial preview prepared for publication. It is not on npm yet.

The runtime includes the protocol, controller, immutable proposals, streaming
transports, Markdown preparation, Tiptap integration, React `useEditorAi`, and
Web Platform server helpers. Editable UI and provider recipes are distributed
through the Shadcn registry, separately from this package.

Documentation: https://getemend.vercel.app/docs.

Validation is manual and build-based. There is no automated regression suite.

## Module boundaries

The current public entry points are:

- **Root** — protocol, proposal, controller, and transport exports for common consumers.
- **protocol** — versioned requests and stream events, action policy, controller state, errors, transitions, and boundary validators.
- **proposal** — immutable Markdown proposal snapshots captured against their source request.
- **content** — Tiptap-backed Source Markdown serialization and completed-proposal preparation.
- **tiptap** — consumer-editor capture, revision tracking, proposal decorations, target-aware preparation, and exact-range Accept/Reject.
- **transport** — one-shot fetch/SSE transport and deterministic mock transport.
- **server** — framework-neutral Web `Request`, `Response`, SSE, and mock-generation helpers.
- **react** — `useEditorAi` for one shared editor session across AI surfaces.

The package can be imported through `@emend/ai`, `@emend/ai/protocol`,
`@emend/ai/proposal`, `@emend/ai/content`, `@emend/ai/transport`,
`@emend/ai/tiptap`, `@emend/ai/server`, and `@emend/ai/react`.

The content entry point does not expose Tiptap Markdown manager, Marked lexer,
or handler internals. Those remain behind the package boundary.

## Markdown content boundary

`@emend/ai/content` treats the live Tiptap document as canonical and uses
`@tiptap/markdown` as the model-facing projection. Every AI-enabled editor
must configure compatible, aligned Tiptap Markdown support; Emend does not
inject StarterKit or duplicate consumer-owned extensions.

The default Supported Markdown profile includes paragraphs, headings, bold,
italic, combined emphasis, strikethrough, underline, inline code, validated
links, nested bullet and ordered lists, nested task lists, blockquotes, fenced
code blocks, hard breaks, horizontal rules, and basic GFM tables.

Tiptap remains authoritative for Markdown syntax and ordinary node and mark
attributes. Emend's node and mark allowlists are internal implementation
details, not a public schema or configuration object. A matching name alone
does not make custom consumer nodes supported.

Basic GFM tables require a complete header row, equal column counts, supported
inline content, and one paragraph per cell. Alignment, escaped pipes, and a
cell hard break are supported. Merged cells, spans, column widths, mixed or
missing headers, and multiple block children are outside the automatic V0
guarantee.

Source serialization keeps the edit target and read-only context in separate
fields. Unsupported target content blocks the whole target. Unsupported
context is blocked unless the caller supplies a visibly labelled plain-text
Context projection; a projection is not Supported Markdown and is not a
round trip.

Completed Proposal Markdown has exactly one of three outcomes:

- `supported-markdown` — normalized Markdown plus schema-valid Tiptap JSON;
- `plain-text-fallback` — an explicit, reviewable text projection for a caller-confirmed text-safe target;
- `blocked` — the content cannot be represented safely by the configured schema.

Raw proposal Markdown remains reviewable and copyable. Emend does not mutate
the document, create ProseMirror slices, dispatch transactions, or implement
Accept in this boundary. Arbitrary raw HTML and generated images are disabled;
the only HTML-shaped exception is an attribute-free `<br>` inside a table cell.
Link destinations are protocol-validated, including links nested in tables.

## Tiptap integration boundary

`@emend/ai/tiptap` works with an existing consumer-owned vanilla Tiptap
`Editor`. The consumer supplies the schema and Markdown support, then installs
one `EmendAi` extension. The complete default composition is:

```ts
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { Markdown } from "@tiptap/markdown"
import StarterKit from "@tiptap/starter-kit"
import { EmendAi } from "@emend/ai/tiptap"

const extensions = [
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit,
  Markdown.configure({ markedOptions: { gfm: true } }),
  EmendAi,
]
```

This is the complete default profile, not a request to add duplicate
extensions. An existing editor can keep equivalent schema and Markdown
handlers. `StarterKit` belongs to that consumer editor or to the supplied
editor starter; it is not bundled by `@emend/ai` core.

Create one adapter for the editor and connect its `capture` and
`isSourceRevisionCurrent` helpers to `EmendAiController`:

```ts
const adapter = createEmendTiptapAdapter(editor)

adapter.capture(options)
adapter.prepare(proposal, editedMarkdown)
adapter.show(proposal, preparation, { inlinePreview: true })
adapter.accept(proposal, preparation, {
  confirmDocumentReplacement: false,
})
adapter.reject(proposal.id)
adapter.getEditorState()
```

Capture keeps exact target and context ranges, Source Markdown, source marks,
schema capabilities, and the local source slice in the adapter. `prepare`
returns target-aware Supported Markdown, an explicit Plain-text fallback, or a
blocked error. `show` creates ephemeral target and preview decorations;
selection and cursor changes do not retarget them, while any content-changing
transaction makes the proposal stale. A stale proposal cannot be prepared or
accepted again.

Basic GFM tables are applyable only at an exact block-compatible target that
the configured schema accepts. Accept performs one exact-range replacement in
one isolated undo event. The exported `EMEND_AI_TRANSACTION_META` key records:

```ts
{
  origin: "emend-ai",
  proposalId: string,
  actionId: string,
  userModified: boolean,
}
```

`EmendAi` decoration classes and data attributes are styling hooks only. A
non-empty Document replacement requires `confirmDocumentReplacement: true`,
and missing editor integration returns `editor_not_configured`. The
editor-neutral `clearPendingProposal(proposalId)` acknowledgment is called
only after successful Accept or explicit Reject; it never applies content.

## Mock route pattern

The server helpers can be adapted directly to a Web-compatible route while the
runtime is being developed:

```ts
import { createEmendAiHandler, mockGenerate } from "@emend/ai/server"

export const POST = createEmendAiHandler({ generate: mockGenerate })
```

The client uses the same route through the transport boundary:

```ts
import { createFetchTransport } from "@emend/ai/transport"

const transport = createFetchTransport({ url: "/api/emend" })
```

The handler validates the protocol request and emits a typed SSE stream. An
integrator-owned provider generator can replace `mockGenerate` without changing
the controller or transport contracts.

## Dependency rules

- Core modules do not import Next.js, shadcn, Tailwind, or provider SDKs.
- Protocol, proposal, and transport do not import React.
- Server helpers use Web Platform APIs and do not import Next.js.
- Content and direct Tiptap integration use exact aligned `@tiptap/core`, `@tiptap/markdown`, and `@tiptap/pm` peers and do not bundle StarterKit.
- Provider SDKs belong in registry server recipes.
- React 19 is an optional peer used only by the `react` entry point.
- Shared review UI, provider recipes, and the editor starter are registry source.
- UI is not published from this package.

## Development

Run these commands from the repository root:

```bash
pnpm install
pnpm --filter @emend/ai dev
pnpm --filter @emend/ai format
pnpm --filter @emend/ai lint
pnpm --filter @emend/ai typecheck
pnpm --filter @emend/ai build
```

## License

This package is MIT-licensed. See [LICENSE](LICENSE).
