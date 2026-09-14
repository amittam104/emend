# Consumer installation fixtures

These isolated Next.js apps use a packed `@emend/ai` tarball:

- `existing-editor` demonstrates the three independently installable AI surfaces.
- `editor-starter` lets you switch between all four starter choices. Its default
  is Bubble Menu; this comparison fixture deliberately contains all choices.

Consumer apps must have Shadcn initialized before adding registry items. These
fixtures use the `base-nova` style and its Base UI/CVA dependencies.

Use Node 24.19.0 and pnpm 11.21.0. From the repository root:

```sh
pnpm --filter @emend/ai build
mkdir -p .artifacts
pnpm --dir packages/ai pack --pack-destination ../../.artifacts
pnpm --dir fixtures/existing-editor install
pnpm --dir fixtures/editor-starter install
```

Run `pnpm --dir apps/web dev` on port 3000 to serve the registry. Both fixture
`components.json` files map `@emend` to `http://127.0.0.1:3000/r/{name}.json`.
Refresh the copied sources with:

```sh
pnpm --dir fixtures/existing-editor exec shadcn add @emend/ai-bubble-menu @emend/ai-composer @emend/ai-side-chat @emend/recipe-vercel-ai-gateway --overwrite --yes
pnpm --dir fixtures/editor-starter exec shadcn add @emend/emend-editor @emend/emend-editor-base @emend/emend-editor-side-chat @emend/emend-editor-composer @emend/recipe-vercel-ai-gateway --overwrite --yes
```

For a consumer installation, choose one starter:

| Registry item            | Export                | AI surface            |
| ------------------------ | --------------------- | --------------------- |
| `emend-editor`           | `EmendEditor`         | Bubble Menu (default) |
| `emend-editor-base`      | `EmendEditorBase`     | None                  |
| `emend-editor-side-chat` | `EmendEditorSideChat` | Side Chat             |
| `emend-editor-composer`  | `EmendEditorComposer` | Composer              |

Exports live under `components/emend/emend-editor/<item-name>`. The default
also has a directory-level export. AI starters depend on the shared plain editor
and only their selected surface. Side Chat includes its own composer and does
not depend on the standalone Composer.

The real Gateway recipe installs separately at `app/api/editor-ai/route.ts`.
Set the server-side `AI_GATEWAY_API_KEY`, connect the handler's `authorize` hook
to the application's authentication, and point the transport to `/api/editor-ai`.
The fixtures use a separate internal `/api/demo-ai` mock for browser checks;
the installed real route remains intact. Public demos use `/api/phase-2`.
Mocks are not registry items. Public setup documentation follows next phase.

Each fixture supports `pnpm build`, `pnpm typecheck`, and
`pnpm dev --port 3101` (use port 3102 for the starter). Generated registry JSON,
tarballs, dependency folders, and build output stay ignored.

Verification on 2026-09-14:

- All eight catalog items build into Shadcn registry payloads.
- Four isolated consumer installations typecheck and build. Copied source uses
  consumer imports and the AI starters use the packed runtime.
- The plain editor installs no AI runtime or AI surfaces. The default installs
  only Bubble Menu; Side Chat installs no standalone Composer; the Composer
  starter installs no Side Chat or AI Bubble Menu.
- The Gateway recipe installs and builds without credentials at build time.
  No paid Gateway request is part of this verification.
- Browser checks cover the default Bubble Menu edit/review/Accept flow, no-AI
  formatting, Side Chat Ask/follow-up/slash-edit/apply and pending-review guard,
  and standalone Composer Ask/Edit/review.
- Root typecheck, lint, and production build pass; both repository fixtures
  typecheck and build.
