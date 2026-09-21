"use client"

import type { ComponentProps } from "react"
import Link from "fumadocs-core/link"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { Container } from "fumadocs-ui/layouts/docs/slots/container"
import {
  SidebarProvider,
  useSidebar,
} from "fumadocs-ui/layouts/docs/slots/sidebar"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import { DocsHeader, DocsThemeSwitch } from "./docs-header"
import { DocsSidebar, DocsSidebarTrigger } from "./docs-sidebar"

function DocsContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <Container
      {...props}
      className={cn(
        "md:[grid-template-areas:'sidebar_sidebar_header_header_header'_'sidebar_sidebar_toc-popover_toc-popover_toc-popover'_'sidebar_sidebar_main_toc_toc']!",
        className
      )}
    />
  )
}

function DocsNavTitle({ className, ...props }: ComponentProps<"a">) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <Image
        src="/emend-logo.svg"
        alt=""
        width={20}
        height={20}
        className="rounded"
      />
      <span>emend</span>
    </Link>
  )
}

export function DocsLayoutShell({
  sidebar,
  slots,
  ...props
}: ComponentProps<typeof DocsLayout>) {
  return (
    <>
      <a
        href="#nd-page"
        className="bg-fd-background text-fd-foreground focus-visible:outline-fd-ring sr-only fixed start-4 top-4 z-50 rounded-lg px-3 py-2 text-sm font-medium focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Skip to content
      </a>
      <DocsLayout
        {...props}
        sidebar={sidebar}
        tabMode=""
        slots={{
          ...slots,
          container: slots?.container ?? DocsContainer,
          header: DocsHeader,
          navTitle: DocsNavTitle,
          themeSwitch: DocsThemeSwitch,
          sidebar: slots?.sidebar ?? {
            provider: SidebarProvider,
            root: DocsSidebar,
            trigger: DocsSidebarTrigger,
            useSidebar,
          },
        }}
      />
    </>
  )
}
