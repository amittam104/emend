"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

export function LandingFindReplace({ editor }: { readonly editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState("")
  const [replacement, setReplacement] = useState("")
  const { count, currentIndex } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      count: currentEditor.storage.findAndReplace.results.length,
      currentIndex: currentEditor.storage.findAndReplace.currentIndex,
    }),
  })

  function search(nextTerm: string) {
    setTerm(nextTerm)
    editor.commands.setSearchTerm(nextTerm)
  }

  function close() {
    setOpen(false)
    setTerm("")
    setReplacement("")
    editor.commands.clearSearch()
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={open ? "outline" : "ghost"}
              size="icon-xs"
              className="border-border transition-[background-color,color,scale] duration-100 active:not-aria-[haspopup]:translate-y-0 motion-safe:active:not-aria-[haspopup]:scale-96"
              aria-label="Find and replace"
              aria-pressed={open}
              onClick={() => (open ? close() : setOpen(true))}
            />
          }
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
        </TooltipTrigger>
        <TooltipContent>Find and replace</TooltipContent>
      </Tooltip>

      {open && (
        <div className="fixed top-11 right-1.5 z-60 w-[min(24rem,calc(100vw-0.75rem))] rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg">
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={term}
              placeholder="Find"
              aria-label="Find"
              className="h-7 text-sm"
              onChange={(event) => search(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  editor.commands.goToNextResult()
                }
                if (event.key === "Escape") close()
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous match"
              disabled={count === 0}
              onClick={() => editor.commands.goToPreviousResult()}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next match"
              disabled={count === 0}
              onClick={() => editor.commands.goToNextResult()}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
            </Button>
            <span className="min-w-14 text-center text-xs text-muted-foreground tabular-nums">
              {term
                ? `${count === 0 ? 0 : (currentIndex ?? 0) + 1} / ${count}`
                : ""}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1">
            <Input
              value={replacement}
              placeholder="Replace with"
              aria-label="Replace with"
              className="h-7 text-sm"
              onChange={(event) => {
                setReplacement(event.target.value)
                editor.commands.setReplaceTerm(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  editor.commands.replace()
                }
                if (event.key === "Escape") close()
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={count === 0}
              onClick={() => editor.commands.replace()}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={count === 0}
              onClick={() => editor.commands.replaceAll()}
            >
              All
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
