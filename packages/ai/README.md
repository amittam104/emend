<p align="center">
  <img alt="@emend/ai README Header" src="https://shieldcn.dev/header/glow.svg?title=%40emend%2Fai&amp;subtitle=Provider-Neutral+Human-in-the-Loop+AI+Editing+Runtime+for+Tiptap&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

## What is @emend/ai?

`@emend/ai` is a provider-neutral human-in-the-loop AI editing runtime for Tiptap.

## Status

`@emend/ai` is under internal V0 development and is not published yet.

The versioned protocol, immutable proposals, framework-neutral controller,
provider-neutral transports, Web Platform server helpers, and the Markdown
content boundary are implemented. Tiptap document application, editor
integrations, and UI surfaces remain later V0 work.

## Module boundaries

The current public entry points are:

- **Root** — protocol, proposal, controller, and transport exports for common consumers.
- **protocol** — versioned requests and stream events, action policy, controller state, errors, transitions, and boundary validators.
- **proposal** — immutable Markdown proposal snapshots captured against their source request.
- **content** — Tiptap-backed Source Markdown serialization and completed-proposal preparation.
- **transport** — one-shot fetch/SSE transport and deterministic mock transport.
- **server** — framework-neutral Web `Request`, `Response`, SSE, and mock-generation helpers.

The package can be imported through `@emend/ai`, `@emend/ai/protocol`,
`@emend/ai/proposal`, `@emend/ai/content`, `@emend/ai/transport`, and
`@emend/ai/server`.

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
- Content uses exact aligned `@tiptap/core`, `@tiptap/markdown`, and `@tiptap/pm` peers and does not bundle StarterKit.
- Provider SDKs belong in registry server recipes.
- React, Tiptap document application, and editor UI adapters remain outside this package boundary.
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
