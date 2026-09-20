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

function DocsContainer({ style, ...props }: ComponentProps<"div">) {
  return (
    <Container
      {...props}
      style={{
        ...style,
        gridTemplateAreas: `"sidebar sidebar header header header"
"sidebar sidebar toc-popover toc-popover toc-popover"
"sidebar sidebar main toc toc"`,
      }}
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
    <DocsLayout
      {...props}
      sidebar={sidebar}
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
  )
}
