"use client"

import type { ComponentProps } from "react"
import Link from "fumadocs-core/link"
import { DocsLayout } from "fumadocs-ui/layouts/notebook"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import { docsSidebarComponents } from "./docs-sidebar"

function DocsNavTitle({ className, ...props }: ComponentProps<"a">) {
  return (
    <Link
      href="/docs"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <Image
        src="/emend%20logo.svg"
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
      sidebar={{
        ...sidebar,
        components: {
          ...docsSidebarComponents,
          ...sidebar?.components,
        },
      }}
      slots={{ ...slots, navTitle: DocsNavTitle }}
    />
  )
}
