<p align="center">
  <img alt="@emend/ai README Header" src="https://shieldcn.dev/header/glow.svg?title=%40emend%2Fai&amp;subtitle=Provider-Neutral+Human-in-the-Loop+AI+Editing+Runtime+for+Tiptap&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

## What is @emend/ai?

`@emend/ai` is a provider-neutral human-in-the-loop AI editing runtime for Tiptap.

## Status

`@emend/ai` is under internal V0 development and is not published yet.

The versioned protocol and immutable proposal boundaries are implemented for
Phase 2. The package is still unpublished; the controller, streaming
transport, server helpers, content adapters, editor integrations, and UI
surfaces remain later implementation work.

## Module boundaries

The current public entry points are:

- **Root** — common consumer entry point.
- **protocol** — versioned requests, actions, states, errors, transitions, and boundary validators.
- **proposal** — immutable Markdown proposal snapshots.
- **transport** — reserved public subpath; provider-neutral streaming is a later Phase 2 step.
- **content** — Markdown normalization and parse results.
- **tiptap** — `EmendAi` and editor integration.
- **react** — `useEditorAi`.
- **server** — reserved public subpath; framework-neutral `Request` and `Response` helpers are a later Phase 2 step.

The package can be imported through `@emend/ai`, `@emend/ai/protocol`,
`@emend/ai/proposal`, `@emend/ai/transport`, and `@emend/ai/server`.

## Dependency rules

- Core modules do not import Next.js, shadcn, Tailwind, or provider SDKs.
- Protocol, proposal, transport, and content do not import React.
- Provider SDKs belong in registry server recipes.
- Tiptap and React become peer dependencies only when their adapters are implemented.
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
