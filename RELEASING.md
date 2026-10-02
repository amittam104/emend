# Releasing Emend

The first release is the `0.1.0` preview. Publish only `@emend/ai` from
`packages/ai`. UI components and recipes are served as editable registry source
at `https://getemend.vercel.app/r/{name}.json`.

## Prepare and review

1. Work on a branch from updated `main` and open a pull request with a matching
   GitHub issue. Complete review and CI before rebase-and-merge.
2. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm registry:validate`,
   `pnpm fixtures:verify`, and `git diff --check`.
3. Run `pnpm --dir packages/ai pack --dry-run` and inspect the packed manifest,
   eight entry points, declarations, license, README, and changelog.
4. Manually verify Bubble Menu, Composer, and Assistant on both onboarding paths:
   Ask/Edit, selection/block/document targets, context scopes, streaming Stop,
   retry, regenerate, draft edits, Accept/Reject, stale content, undo, malformed
   output, unsupported content, document replacement confirmation, persistence,
   keyboard use, mobile layout, and light/dark modes. Record the evidence and
   any unverified cases before publication. Current evidence is recorded in
   [RELEASE_VALIDATION.md](RELEASE_VALIDATION.md).
5. After merging, verify the production website and all registry URLs. Keep the
   "not on npm yet" documentation notice until publication succeeds.

## Publish after explicit approval

Browser login does not authenticate the terminal. Use `npm login`, complete
the browser/2FA prompts yourself, and confirm `npm whoami` is the organization
owner or an authorized publisher.

From the merged, clean `main` commit:

```sh
pnpm install --frozen-lockfile
pnpm release:pack
cd packages/ai
npm publish --access public --tag preview
cd ../..
npm view @emend/ai@0.1.0 version dist-tags
```

The `preview` npm tag avoids presenting an early release as stable. During this
preview, the registry pins `@emend/ai@0.1.0`; direct npm installation uses
`npm install @emend/ai@preview`.

Repeat both onboarding paths in clean consumer apps using the production registry
and the published npm package. After they work, create and push an annotated
`v0.1.0` Git tag at the release commit, then create a GitHub **prerelease** for
that tag. Include the website, installation instructions, supported Tiptap
version, and known limitations. A Git tag alone does not publish npm or validate
the installation.

Remove the unpublished notices through a follow-up PR once npm publication and
public installs are verified. Keep the Vercel registry URLs working if a custom
domain is added later.

## Later runtime releases

Add a changeset with `pnpm changeset`. Once deletion of consumed changeset files
is authorized, run `pnpm release:version` and review the version/changelog diff.
Update registry runtime pins when adopting a new runtime release. Repeat the
checks above before publishing. No automatic publishing workflow is configured.
