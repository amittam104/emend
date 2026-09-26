"use client"

import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Node } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import Link from "next/link"

import { ShowcaseClip } from "./showcase-clip"

const showcaseItems = [
  {
    clip: "composer",
    name: "Composer",
    description:
      "A prompt bar under your document. Pick an action, then review the change before it lands.",
    href: "/docs/ai-composer",
  },
  {
    clip: "bubble",
    name: "Bubble menu",
    description:
      "Select text and rewrite it in place, with Keep and Discard right beside it.",
    href: "/docs/ai-bubble-menu",
  },
  {
    clip: "assistant",
    name: "AI Assistant",
    description:
      "A floating chat that reads your document, answers questions, and proposes edits.",
    href: "/docs/ai-assistant",
  },
  {
    clip: "starter",
    name: "Editor starter",
    description:
      "A complete Tiptap editor with formatting, tables, and your choice of AI surface.",
    href: "/docs/emend-editor-starter",
  },
] as const

function ComponentShowcaseView() {
  return (
    <NodeViewWrapper className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
      {showcaseItems.map((item) => (
        <Link
          key={item.clip}
          href={item.href}
          className="group hover:shadow-elevation-2 flex flex-col overflow-hidden rounded-xl border border-border bg-muted/50 !text-card-foreground !no-underline transition-[border-color,box-shadow] duration-300 ease-out hover:border-foreground/20 dark:bg-card"
        >
          <div className="aspect-[16/10] overflow-hidden border-b border-border bg-muted">
            <ShowcaseClip clip={item.clip} />
          </div>
          <div className="flex flex-col gap-1 px-4 pt-3 pb-4">
            <span className="flex items-center justify-between gap-2 text-[15px] font-semibold">
              {item.name}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 text-muted-foreground transition-[translate,color] duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </span>
            <span className="text-sm leading-normal text-pretty text-muted-foreground">
              {item.description}
            </span>
          </div>
        </Link>
      ))}
    </NodeViewWrapper>
  )
}

export const ComponentShowcase = Node.create({
  name: "componentShowcase",
  group: "block",
  atom: true,
  selectable: false,
  parseHTML: () => [{ tag: "div[data-component-showcase]" }],
  renderHTML: () => ["div", { "data-component-showcase": "" }],
  addNodeView: () => ReactNodeViewRenderer(ComponentShowcaseView),
})
