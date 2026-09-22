import type { ReactNode } from "react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import { HugeiconsIcon } from "@hugeicons/react"
import { buttonVariants } from "fumadocs-ui/components/ui/button"
import { DocsLayout } from "fumadocs-ui/layouts/notebook"

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/components/ai/search"
import { baseOptions } from "@/lib/layout.shared"
import { getDocsPageTree } from "@/lib/source"
import { cn } from "@workspace/ui/lib/utils"

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
          className={cn(
            buttonVariants({
              variant: "secondary",
              className: "text-fd-muted-foreground rounded-2xl",
            })
          )}
        >
          <HugeiconsIcon
            icon={AiChat02Icon}
            aria-hidden="true"
            className="size-4.5"
            strokeWidth={1.8}
          />
          Ask AI
        </AISearchTrigger>
      </AISearch>
      {children}
    </DocsLayout>
  )
}
