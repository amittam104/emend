"use client"

import { Mention } from "@tiptap/extension-mention"
import { ReactRenderer } from "@tiptap/react"
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

interface MentionItem {
  readonly id: string
  readonly label: string
}

interface MentionListProps {
  readonly command: (item: MentionItem) => void
  readonly items: readonly MentionItem[]
}

interface MentionListRef {
  readonly onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const mentionItems: readonly MentionItem[] = [
  { id: "bubble-menu", label: "AI Bubble Menu" },
  { id: "composer", label: "AI Composer" },
  { id: "side-chat", label: "AI Assistant" },
  { id: "editor", label: "Emend Editor" },
]

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ command, items }, ref) {
    const [active, setActive] = useState(0)

    useEffect(() => setActive(0), [items])

    function select(index: number) {
      const item = items[index]
      if (item) command(item)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setActive((current) => (current + 1) % items.length)
          return true
        }
        if (event.key === "ArrowUp") {
          setActive((current) => (current + items.length - 1) % items.length)
          return true
        }
        if (event.key === "Enter") {
          select(active)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) return null

    return (
      <div
        role="listbox"
        aria-label="Mention an Emend component"
        className="w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === active}
            className={cn(
              "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm outline-none",
              index === active
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            )}
            onMouseEnter={() => setActive(index)}
            onClick={() => select(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
    )
  }
)

export const landingMention = Mention.configure({
  HTMLAttributes: { class: "emend-mention" },
  suggestion: {
    char: "@",
    items: ({ query }) =>
      mentionItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ),
    render: () => {
      let component: ReactRenderer<MentionListRef, MentionListProps> | null =
        null
      let unmount: (() => void) | null = null

      return {
        onStart: (props: SuggestionProps<MentionItem>) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })
          unmount = props.mount(component.element)
        },
        onUpdate: (props: SuggestionProps<MentionItem>) => {
          component?.updateProps(props)
        },
        onKeyDown: (props) => component?.ref?.onKeyDown(props) ?? false,
        onExit: () => {
          unmount?.()
          component?.destroy()
          component = null
        },
      }
    },
  },
})
