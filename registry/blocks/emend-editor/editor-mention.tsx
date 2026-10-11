"use client"

import { Mention } from "@tiptap/extension-mention"
import { ReactRenderer } from "@tiptap/react"
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { cn } from "@/lib/utils"

export interface EditorMentionItem {
  readonly id: string
  readonly label: string
}

export const editorMentionItems: readonly EditorMentionItem[] = [
  { id: "ai-bubble-menu", label: "AI Bubble Menu" },
  { id: "ai-composer", label: "AI Composer" },
  { id: "ai-assistant", label: "AI Assistant" },
  { id: "emend-editor", label: "Emend Editor" },
]

interface MentionListProps {
  readonly command: (item: EditorMentionItem) => void
  readonly items: readonly EditorMentionItem[]
}

interface MentionListRef {
  readonly onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

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
        if (items.length === 0) return false
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
        aria-label="Mention"
        className="z-50 w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
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
            onMouseDown={(event) => event.preventDefault()}
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

export function createEditorMention(items: readonly EditorMentionItem[]) {
  return Mention.configure({
    HTMLAttributes: { class: "emend-editor__mention" },
    suggestion: {
      char: "@",
      items: ({ query }) =>
        items.filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase())
        ),
      render: () => {
        let component: ReactRenderer<MentionListRef, MentionListProps> | null =
          null
        let clientRect: SuggestionProps<EditorMentionItem>["clientRect"] =
          null

        function position() {
          const element = component?.element
          const rect = clientRect?.()
          if (!(element instanceof HTMLElement) || !rect) return
          const { offsetWidth: width, offsetHeight: height } = element
          const below = rect.bottom + 4
          const top =
            below + height > window.innerHeight && rect.top - 4 - height >= 0
              ? rect.top - 4 - height
              : below
          const left = Math.max(
            4,
            Math.min(rect.left, window.innerWidth - width - 4)
          )
          Object.assign(element.style, {
            position: "fixed",
            top: `${top}px`,
            left: `${left}px`,
            zIndex: "50",
          })
        }

        return {
          onStart: (props: SuggestionProps<EditorMentionItem>) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            })
            clientRect = props.clientRect
            document.body.appendChild(component.element)
            window.addEventListener("scroll", position, true)
            window.addEventListener("resize", position)
            position()
            requestAnimationFrame(position)
          },
          onUpdate: (props: SuggestionProps<EditorMentionItem>) => {
            component?.updateProps(props)
            clientRect = props.clientRect
            requestAnimationFrame(position)
          },
          onKeyDown: (props) => component?.ref?.onKeyDown(props) ?? false,
          onExit: () => {
            window.removeEventListener("scroll", position, true)
            window.removeEventListener("resize", position)
            component?.element.remove()
            component?.destroy()
            component = null
            clientRect = null
          },
        }
      },
    },
  })
}
