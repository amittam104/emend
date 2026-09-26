import type { MDXComponents } from "mdx/types"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { CodeBlockTabsTrigger as FumadocsCodeBlockTabsTrigger } from "fumadocs-ui/components/codeblock"
import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import type { ComponentProps } from "react"

import { Card, Cards, PathCard, PathCards } from "@/components/docs/docs-cards"
import { DocsDemo } from "@/components/docs/docs-demo"
import { DocsHero } from "@/components/docs/docs-hero"
import { FlowDiagram } from "@/components/docs/flow-diagram"
import { EditorDemo } from "@/components/docs/editor-demo"
import {
  Bun,
  Npm,
  Pnpm,
  PnpmDark,
} from "@/components/docs/package-manager-icons"

type CodeBlockTabsTriggerProps = ComponentProps<
  typeof FumadocsCodeBlockTabsTrigger
>

function CodeBlockTabsTrigger({
  children,
  value,
  ...props
}: CodeBlockTabsTriggerProps) {
  const iconProps = { "aria-hidden": true, className: "size-3.5 shrink-0" }

  return (
    <FumadocsCodeBlockTabsTrigger value={value} {...props}>
      {value === "bun" && <Bun {...iconProps} />}
      {value === "npm" && <Npm {...iconProps} />}
      {value === "pnpm" && (
        <>
          <Pnpm {...iconProps} className="size-3.5 shrink-0 dark:hidden" />
          <PnpmDark
            {...iconProps}
            className="hidden size-3.5 shrink-0 dark:block"
          />
        </>
      )}
      {children}
    </FumadocsCodeBlockTabsTrigger>
  )
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Card,
    Cards,
    CodeBlockTabsTrigger,
    Demo: DocsDemo,
    DocsHero,
    EditorDemo,
    FlowDiagram,
    PathCard,
    PathCards,
    Step,
    Steps,
    Tab,
    Tabs,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
