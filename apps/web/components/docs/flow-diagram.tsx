import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import type { ReactNode } from "react"

import { DocsIcon, type DocsIconName } from "./docs-icons"
import { cn } from "@/lib/utils"

function Layer({
  icon,
  name,
  detail,
  accent = false,
}: {
  readonly icon: DocsIconName
  readonly name: ReactNode
  readonly detail: string
  readonly accent?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-fd-card shadow-elevation-1 flex items-start gap-3 rounded-xl border p-3",
        accent && "border-fd-foreground/20"
      )}
    >
      <span className="bg-fd-muted/60 text-fd-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border">
        <DocsIcon name={icon} className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-fd-muted-foreground text-[13px] leading-snug text-pretty">
          {detail}
        </span>
      </span>
    </div>
  )
}

function Group({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return (
    <div className="bg-fd-background/60 flex flex-col gap-2 rounded-2xl border border-dashed p-3">
      <span className="text-fd-muted-foreground px-1 text-[11px] font-medium tracking-wider uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

function Flow({
  icon,
  label,
  className,
}: {
  readonly icon: IconSvgElement
  readonly label: string
  readonly className?: string
}) {
  return (
    <span
      className={cn(
        "text-fd-muted-foreground flex items-center gap-1 text-[11px] font-medium whitespace-nowrap",
        className
      )}
    >
      <HugeiconsIcon icon={icon} aria-hidden className="size-3.5" />
      {label}
    </span>
  )
}

/**
 * The request path through the four layers: the copied UI and runtime run in
 * the browser beside the editor, and the route runs on the consumer's server.
 */
export function FlowDiagram() {
  return (
    <figure className="not-prose bg-fd-card relative my-8 overflow-hidden rounded-2xl border p-4 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklch,var(--color-fd-foreground)_14%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[size:16px_16px]"
      />
      <div className="relative grid items-center gap-3 md:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1fr)]">
        <Group label="Browser">
          <Layer
            icon="LayoutBottomIcon"
            name="Copied UI"
            detail="Bubble Menu, Composer, or AI Assistant source in your app."
          />
          <Layer
            icon="PencilEdit02Icon"
            name="Your Tiptap editor"
            detail="Owns the document, schema, selection, and undo history."
          />
          <Layer
            accent
            icon="Layers01Icon"
            name={<code className="font-semibold">@emend/ai</code>}
            detail="Captures Markdown, tracks revisions, and prepares proposals."
          />
        </Group>

        <div className="flex items-center justify-center gap-4 md:flex-col md:gap-2">
          <Flow
            icon={ArrowRight01Icon}
            label="Request"
            className="max-md:hidden"
          />
          <Flow icon={ArrowDown01Icon} label="Request" className="md:hidden" />
          <Flow
            icon={ArrowLeft01Icon}
            label="Stream"
            className="max-md:hidden"
          />
          <Flow icon={ArrowUp01Icon} label="Stream" className="md:hidden" />
        </div>

        <Group label="Your server">
          <Layer
            icon="ServerStack01Icon"
            name="Your route"
            detail="Authorizes, rate-limits, and calls the model."
          />
          <Flow
            icon={ArrowDown01Icon}
            label="Provider call"
            className="justify-center py-0.5"
          />
          <Layer
            icon="AiChat02Icon"
            name="Model provider"
            detail="Any AI SDK provider. Credentials never reach the browser."
          />
        </Group>
      </div>
      <figcaption className="text-fd-muted-foreground relative mt-4 text-center text-[13px] text-pretty">
        Nothing changes the document until the person writing accepts a
        proposal. Accept applies one undoable Tiptap change.
      </figcaption>
    </figure>
  )
}
