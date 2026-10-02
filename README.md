<p align="center">
  <img alt="Emend README Header" src="https://shieldcn.dev/header/glow.svg?title=Emend&amp;subtitle=AI+Powered+Rich+Text+Editor+Based+on+Tiptap+and+Editor+UI+Components&amp;logo=graphite_editor&amp;size=social&amp;mode=dark&amp;theme=blue&amp;font=geist&amp;border=false" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@emend/ai"><img alt="badge" src="https://shieldcn.dev/npm/%40emend%2Fai.svg?size=xs&amp;theme=zinc&amp;font=geist" /></a>
  <a href="https://www.npmjs.com/package/@emend/ai"><img alt="license" src="https://shieldcn.dev/npm/license/%40emend%2Fai.svg?size=xs&amp;theme=zinc&amp;font=geist" /></a>
</p>

## What is Emend?

- Batteries-included AI components.
- A batteries-included, styled rich-text editor.
- Built on top of Tiptap and ProseMirror.
- Teams with an existing Tiptap editor can add Emend components without replacing it.
- New projects can use a fully built Emend editor.

## Development Status

The `0.1.0` preview is prepared for publication; `@emend/ai` is not on npm yet.
The runtime, React integration, AI surfaces, editor starters, and provider recipe
are implemented. Public installation becomes available after npm publication.

- [Website and documentation](https://getemend.vercel.app)
- [Release preparation and publishing](RELEASING.md)
- [Security policy](SECURITY.md)

Validation is manual and build-based. There is no automated regression suite.
We are not accepting contributions until we reach a stable release.

## Distribution Model

| Artifact       | Distribution       | Responsibility                                                                    |
| -------------- | ------------------ | --------------------------------------------------------------------------------- |
| @emend/ai      | npm package        | Shared protocol, proposal, transport, content, Tiptap, React, and server behavior |
| Components     | shadcn registry    | Bubble Menu, AI Composer, AI Assistant, and Editor Starter                        |
| Server recipes | shadcn registry    | Integrator-owned provider wiring and credentials                                  |
| apps/web       | Hosted Next.js app | Documentation, demos, and registry JSON                                           |

## Repository Layout

- apps/web — Next.js website, documentation, demos, and registry host.
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
does not apply changes to an editor document. Documentation demos demonstrate the boundaries without requiring a provider key.

## Tiptap runtime boundary

The unpublished `@emend/ai/tiptap` entry connects the completed controller and
Markdown boundary to a consumer-owned Tiptap editor. It captures exact target
and context ranges, keeps proposal previews ephemeral, rejects stale content,
and applies an accepted proposal through one exact-range transaction with one
isolated Undo event. Cursor and selection changes do not retarget an open
proposal.

## AI Bubble Menu

The editable `AiBubbleMenu` source mounts against a consumer-owned Tiptap editor
with an explicit transport. `AiBubbleMenuView` can instead use an existing
`useEditorAi` session so initiation, inline preview, and review share one
controller. The editor must configure compatible `@tiptap/markdown` support and
the `EmendAi` extension.

The Bubble Menu is available as registry source; public installation awaits
npm publication of `@emend/ai`.

## AI Composer

The editable `AiComposer` source provides one instruction followed by either an
informational Ask response or a deliberate Edit proposal. `AiComposer` mounts
against a consumer-owned Tiptap `editor` and `transport`; `AiComposerView`
composes with an existing `useEditorAi` session so Bubble Menu and Composer can
share one controller, preview, review, and apply lifecycle.

Composer keeps read context separate from mutation authority. Read scopes are
Selection, Current block, and Document. Edit changes are Replace Selection,
Replace Current block, Replace Document, and Insert at cursor. Typed text with
no selected action is Ask and cannot change the document; Custom instruction is
the intentional Edit path. `AiComposerPolicy` can narrow allowed scopes and
operations, set adaptive or fixed defaults, and show or hide user overrides.

Registry components and the Vercel AI Gateway recipe are implemented; public
installation awaits npm publication.

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
