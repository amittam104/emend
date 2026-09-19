import type { MDXComponents } from "mdx/types"
import defaultMdxComponents from "fumadocs-ui/mdx"

import { DocsDemo } from "@/components/docs/docs-demo"
import { EditorDemo } from "@/components/docs/editor-demo"

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Demo: DocsDemo,
    EditorDemo,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
