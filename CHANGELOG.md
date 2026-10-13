# Changelog

## 0.2.2

- Add a fully visible, responsive Mac-layout branded keyboard below the landing
  text, including the knob, with light and dark themes.
- Add continuous smooth page scrolling with Lenis and tighten landing spacing.
- Keep the published `@emend/ai` runtime at `0.1.2`; this release updates the
  website and registry metadata without runtime source changes.

## 0.2.1

- Add canonical URLs, Open Graph and Twitter cards, a sitemap, and robots rules.
- Add branded landing share images and page-specific Fumadocs share images.
- Render landing content before JavaScript loads, refresh icons and package copy,
  and redirect the renamed AI Side Chat page to AI Assistant.

## 0.2.0

- Add link editing with relative-link support, image insertion and uploads, text
  and highlight colors, and horizontally scrolling editor toolbars.
- Add find-and-replace and configurable mention suggestions to the editor starters.
- Preserve compatibility with older Tiptap 3 mention APIs and pass configured
  mention labels into AI document context.
- Improve landing-page actions, theme controls, and editor demos.
- Document the new editor controls, mention configuration, and AI Assistant setup.
- Keep the published `@emend/ai` runtime at `0.1.2`; this release updates the
  website and editable registry components without runtime source changes.

## 0.1.2

- Support Tiptap 3.7.1 or later instead of requiring exactly 3.31.4.
- Keep the Tiptap versions already installed in the app when adding components.
- Test emend against the oldest and newest Tiptap 3, with weekly Tiptap update PRs.
- Explain supported Tiptap versions and how to fix version conflicts.
- Remove the formatting menu from the composer and assistant editors.
- Simplify the introduction, installation, component, concept, recipe, and
  troubleshooting pages.

## 0.1.1

- Update installation guides and READMEs for the published `@emend/ai` package.
- Restore npm version and license badges and add README header images.
- Simplify the npm package README and description.
- Correct Shadcn setup to use Base UI and document aligned Tiptap dependencies.
- Fix starter imports and code highlights in the docs.

## 0.1.0

- Release the initial preview runtime, editable AI components, editor starters,
  documentation, and Vercel AI Gateway recipe.
- Use `https://getemend.vercel.app` for the public website and registry.
- Align Tiptap dependencies to `3.31.4`.
- Add runtime Changesets configuration and registry checks in CI.
- Remove unused Side Chat aliases and the obsolete review card.
- Build workspace dependencies before development and preserve runtime output
  during watch rebuilds.

Package versions are recorded in [the runtime changelog](packages/ai/CHANGELOG.md).
