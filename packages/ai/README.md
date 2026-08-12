<p align="center">
  <img alt="@emend/ai README Header" src="https://shieldcn.dev/header/glow.svg?title=%40emend%2Fai&amp;subtitle=Provider-Neutral+Human-in-the-Loop+AI+Editing+Runtime+for+Tiptap&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

## What is @emend/ai?

`@emend/ai` is a provider-neutral human-in-the-loop AI editing runtime for Tiptap.

## Status

`@emend/ai` is under internal V0 development and is not published yet.

The package currently contains only a buildable package shell. It does not expose usable AI APIs yet.

## Planned module boundaries

These boundaries are planned for later phases. They are documented here for package architecture only; they are not implemented or exported in Phase One.

- **Root** — common consumer entry point.
- **protocol** — versioned requests, actions, states, and errors.
- **proposal** — immutable proposal lifecycle.
- **transport** — provider-neutral streaming and cancellation.
- **content** — Markdown normalization and parse results.
- **tiptap** — `EmendAi` and editor integration.
- **react** — `useEditorAi`.
- **server** — framework-neutral `Request` and `Response` helpers.

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
