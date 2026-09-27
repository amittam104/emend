import type { ReactNode } from "react"
import AiArtIcon from "@hugeicons/core-free-icons/AiArtIcon"
import { HugeiconsIcon } from "@hugeicons/react"
import { DocsLayout } from "fumadocs-ui/layouts/notebook"

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/components/ai/search"
import { baseOptions } from "@/lib/layout.shared"
import { getDocsPageTree } from "@/lib/source"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions()}
      tree={getDocsPageTree()}
      tabMode="navbar"
      sidebar={{ className: "emend-docs-sidebar" }}
    >
      <AISearch>
        <AISearchPanel />
        <AISearchTrigger
          position="float"
          className="bg-fd-popover text-fd-foreground shadow-elevation-2 hover:bg-fd-accent focus-visible:ring-fd-ring flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[background-color,translate,opacity,scale] duration-200 focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-[0.97]"
        >
          <HugeiconsIcon
            icon={AiArtIcon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.8}
          />
          Ask AI
        </AISearchTrigger>
      </AISearch>
      {children}
    </DocsLayout>
  )
}
