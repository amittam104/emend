<p align="center">
  <img alt="Emend README Header" src="https://shieldcn.dev/header/glow.svg?title=Emend&amp;subtitle=AI+Powered+Rich+Text+Editor+Based+on+Tiptap+and+Editor+UI+Components&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/emend"><img alt="badge" src="https://shieldcn.dev/npm/emend.svg?size=xs&amp;theme=zinc&amp;font=geist" /></a>
  <a href="https://www.npmjs.com/package/emend"><img alt="license" src="https://shieldcn.dev/npm/license/emend.svg?size=xs&amp;theme=zinc&amp;font=geist" /></a>
</p>

## What is Emend?

- Batteries-included AI components.
- A batteries-included, styled rich-text editor.
- Built on top of Tiptap and ProseMirror.
- Teams with an existing Tiptap editor can add Emend components without replacing it.
- New projects can use a fully built Emend editor.

## Development Status

Emend is in active development and has not been released yet. The unpublished
`@emend/ai` package now includes the provider-neutral protocol, immutable
proposals, controller, streaming transports, Web Platform server helpers, and
the Markdown content boundary. Tiptap document application, editor adapters,
React integration, provider recipes, registry components, and the full editor
remain future V0 work. We are not accepting contributions until we reach a
stable release.

## Distribution Model

| Artifact       | Distribution       | Responsibility                                                                    |
| -------------- | ------------------ | --------------------------------------------------------------------------------- |
| @emend/ai      | npm package        | Shared protocol, proposal, transport, content, Tiptap, React, and server behavior |
| Components     | shadcn registry    | Bubble Menu, AI Composer, AI Side Chat, and Editor Starter                        |
| Server recipes | shadcn registry    | Integrator-owned provider wiring and credentials                                  |
| apps/web       | Hosted Next.js app | Documentation, demos, and registry JSON                                           |

## Repository Layout

- apps/web — current Next.js application and temporary internal Phase 2/3 runtime and content harnesses; later documentation, demos, and registry host.
- packages/ai — unpublished provider-neutral Emend AI runtime.
- packages/ui — private internal shadcn primitives.
- packages/eslint-config — shared ESLint configuration.
- packages/typescript-config — shared TypeScript configuration.

## Markdown content boundary

The unpublished runtime now exposes `@emend/ai/content`, a Tiptap-backed
boundary for separate target/context Source Markdown and completed Proposal
Markdown preparation. Tiptap remains the canonical document model and owns
syntax and attributes. Emend adds focused safety and losslessness checks,
including protocol-validated links, blocked raw HTML and generated images, and
a narrow basic GFM table profile.

Proposal preparation returns Supported Markdown, an explicit Plain-text
fallback only for a caller-confirmed text-safe target, or blocked content. It
does not apply changes to an editor document. The temporary `/phase-3` harness
demonstrates these boundaries without mounting or mutating an editor; it is
internal verification tooling and is not a published UI.

## Development

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## License

MIT-licensed. See [LICENSE](https://github.com/amittam104/emend/blob/main/LICENSE).
