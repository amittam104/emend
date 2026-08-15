<p align="center">
  <img alt="@emend/ai README Header" src="https://shieldcn.dev/header/glow.svg?title=%40emend%2Fai&amp;subtitle=Provider-Neutral+Human-in-the-Loop+AI+Editing+Runtime+for+Tiptap&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

## What is @emend/ai?

`@emend/ai` is a provider-neutral human-in-the-loop AI editing runtime for Tiptap.

## Status

`@emend/ai` is under internal V0 development and is not published yet.

The versioned protocol, immutable proposals, framework-neutral controller,
provider-neutral transports, and Web Platform server helpers are implemented.
Content adapters, editor integrations, and UI surfaces remain later V0 work.

## Module boundaries

The current public entry points are:

- **Root** — protocol, proposal, controller, and transport exports for common consumers.
- **protocol** — versioned requests and stream events, action policy, controller state, errors, transitions, and boundary validators.
- **proposal** — immutable Markdown proposal snapshots captured against their source request.
- **transport** — one-shot fetch/SSE transport and deterministic mock transport.
- **server** — framework-neutral Web `Request`, `Response`, SSE, and mock-generation helpers.

The package can be imported through `@emend/ai`, `@emend/ai/protocol`,
`@emend/ai/proposal`, `@emend/ai/transport`, and `@emend/ai/server`.

Content normalization, Tiptap integration, React adapters, provider wiring,
and registry UI are not part of these entry points yet.

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
