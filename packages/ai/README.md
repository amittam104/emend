<p align="center">
  <img alt="Emend README Header" src="https://getemend.vercel.app/ai-readme-header.svg" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@emend/ai"><img alt="npm version" src="https://img.shields.io/npm/v/%40emend%2Fai" /></a>
  <a href="https://github.com/amittam104/emend/blob/main/LICENSE"><img alt="MIT license" src="https://img.shields.io/npm/l/%40emend%2Fai" /></a>
</p>

## What is @emend/ai?

emend adds AI writing tools to your Tiptap editor. Keep the editor you already
have, or start with a complete emend editor.

`@emend/ai` is the shared runtime behind the AI Bubble Menu, Composer, and
Assistant. It connects your editor to your server, streams the answer, and
applies edits only when you accept them. The UI components and editor starters
are copied into your app through Shadcn, so their source stays yours.

## What you get

- Improve, shorten, expand, or fix selected writing.
- Ask questions about your document without changing it.
- Preview edits, then accept or reject them. Undo an accepted change in one step.
- Keep your model provider, API keys, documents, and server route in your app.

The `0.1.0` preview is [available on npm](https://www.npmjs.com/package/@emend/ai).

## Get started

The runtime requires Node.js 24.19.0 or later and Tiptap `3.31.4`. Keep all
`@tiptap/*` packages on that version. The component guides currently use
Next.js App Router, React 19, Tailwind CSS 4, and Shadcn already configured.

Install the runtime:

```bash
npm install @emend/ai@0.1.0
```

Add this registry entry to your existing `components.json`, keeping its other
settings:

```json
{
  "registries": {
    "@emend": "https://getemend.vercel.app/r/{name}.json"
  }
}
```

Then choose your starting point:

| Your app                    | Command                                       | Guide                                                                           |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| Already has a Tiptap editor | `npx shadcn@latest add @emend/ai-bubble-menu` | [Connect your editor](https://getemend.vercel.app/docs/existing-tiptap-editor)  |
| Needs an editor             | `npx shadcn@latest add @emend/emend-editor`   | [Use the editor starter](https://getemend.vercel.app/docs/emend-editor-starter) |

Both paths need a server route and provider credentials. Install the starting
recipe, then follow the [server setup](https://getemend.vercel.app/docs/vercel-ai-gateway):

```bash
npx shadcn@latest add @emend/recipe-vercel-ai-gateway
```

Keep API keys on the server. The [installation guide](https://getemend.vercel.app/docs/installation)
covers the full setup, including tooltips and editor extensions.

## Build your own AI UI

Use `EmendAi` from `@emend/ai/tiptap`, `createFetchTransport` from
`@emend/ai/transport`, and `useEditorAi` from `@emend/ai/react` to connect your
own controls. See the [API reference](https://getemend.vercel.app/docs/api-reference)
for all entry points and examples.

## License

MIT. See [LICENSE](https://github.com/amittam104/emend/blob/main/LICENSE).
