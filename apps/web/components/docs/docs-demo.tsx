import type { ReactNode } from "react"

interface DocsDemoProps {
  readonly children: ReactNode
  readonly description?: string
  readonly title: string
}

export function DocsDemo({ children, description, title }: DocsDemoProps) {
  return (
    <section className="not-prose bg-fd-card text-fd-card-foreground my-8 overflow-hidden rounded-2xl border shadow-sm">
      <header className="bg-fd-muted/40 border-b px-4 py-3 sm:px-5">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-fd-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </header>
      <div className="p-3 sm:p-5">{children}</div>
    </section>
  )
}
