import type { ReactNode } from "react"

interface DocsDemoProps {
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly description?: string
  readonly title: string
}

export function DocsDemo({
  action,
  children,
  description,
  title,
}: DocsDemoProps) {
  return (
    <section className="not-prose bg-fd-card text-fd-card-foreground my-8 overflow-hidden rounded-2xl border shadow-sm">
      <header className="bg-fd-muted/40 flex flex-col items-start gap-3 border-b px-4 py-3 sm:flex-row sm:gap-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-fd-muted-foreground mt-1 text-sm">
              {description}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="p-3 sm:p-5">{children}</div>
    </section>
  )
}
