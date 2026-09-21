import type { ReactNode } from "react"
import { MessageCircleIcon } from "lucide-react"
import { buttonVariants } from "fumadocs-ui/components/ui/button"
import { DocsLayout } from "fumadocs-ui/layouts/docs"

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/components/ai/search"
import { baseOptions } from "@/lib/layout.shared"
import { source } from "@/lib/source"
import { cn } from "@workspace/ui/lib/utils"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
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
          <MessageCircleIcon className="size-4.5" />
          Ask AI
        </AISearchTrigger>
      </AISearch>
      {children}
    </DocsLayout>
  )
}
