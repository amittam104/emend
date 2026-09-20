import type { ReactNode } from "react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import { HugeiconsIcon } from "@hugeicons/react"

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
        className="bg-fd-primary text-fd-primary-foreground inline-flex w-auto items-center justify-center gap-2 rounded-full px-3 py-3 text-base font-medium"
      >
        <HugeiconsIcon icon={AiChat02Icon} size={16} />

      </AISearchTrigger>
    </AISearch>
  )
}
