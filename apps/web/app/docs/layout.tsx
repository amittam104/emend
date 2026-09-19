import type { ReactNode } from "react"

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/components/ai/search"
import { DocsLayoutShell } from "@/components/docs/docs-layout-shell"
import { baseOptions } from "@/lib/layout.shared"
import { source } from "@/lib/source"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <AISearch>
      <DocsLayoutShell {...baseOptions()} tree={source.getPageTree()}>
        {children}
      </DocsLayoutShell>
      <AISearchPanel />
      <AISearchTrigger
        position="float"
        className="bg-fd-primary text-fd-primary-foreground inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium"
      >
        Ask AI
      </AISearchTrigger>
    </AISearch>
  )
}
