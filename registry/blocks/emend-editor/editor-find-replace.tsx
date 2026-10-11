"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useId, useState, type KeyboardEvent, type ReactElement } from "react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function EditorFindReplace({
  editor,
  trigger,
  strokeWidth,
  className,
}: {
  readonly editor: Editor
  readonly trigger: (active: boolean) => ReactElement
  readonly strokeWidth?: number
  readonly className?: string
}) {
  const id = useId()
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
  const panelId = `${id}-panel`
  const position = count === 0 ? 0 : (currentIndex ?? 0) + 1

  function close() {
    setOpen(false)
    setTerm("")
    setReplacement("")
    editor.chain().clearSearch().setReplaceTerm("").focus().run()
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    onEnter: () => void
  ) {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
    }
    if (event.key === "Enter") {
      event.preventDefault()
      onEnter()
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={trigger(open)}
          aria-label="Find and replace"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <HugeiconsIcon icon={Search01Icon} strokeWidth={strokeWidth} />
        </TooltipTrigger>
        <TooltipContent>Find and replace</TooltipContent>
      </Tooltip>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Find and replace"
          className={cn(
            "absolute top-[calc(100%+0.375rem)] right-1.5 z-50 flex w-[min(24rem,calc(100%-0.75rem))] flex-col gap-1.5 rounded-lg bg-popover p-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10",
            className
          )}
        >
          <div className="flex items-center gap-1">
            <InputGroup className="h-7 flex-1">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                value={term}
                placeholder="Find"
                aria-label="Find"
                spellCheck={false}
                className="h-7"
                onChange={(event) => {
                  setTerm(event.target.value)
                  editor.commands.setSearchTerm(event.target.value)
                }}
                onKeyDown={(event) =>
                  handleKeyDown(event, () =>
                    event.shiftKey
                      ? editor.commands.goToPreviousResult()
                      : editor.commands.goToNextResult()
                  )
                }
              />
              {term && (
                <InputGroupAddon
                  align="inline-end"
                  className="text-xs font-normal tabular-nums"
                  aria-live="polite"
                >
                  {count === 0 ? "No results" : `${position} of ${count}`}
                </InputGroupAddon>
              )}
            </InputGroup>
            <PanelButton
              label="Previous match"
              icon={ArrowUp01Icon}
              disabled={count === 0}
              onClick={() => editor.commands.goToPreviousResult()}
            />
            <PanelButton
              label="Next match"
              icon={ArrowDown01Icon}
              disabled={count === 0}
              onClick={() => editor.commands.goToNextResult()}
            />
            <PanelButton
              label="Close find and replace"
              icon={Cancel01Icon}
              onClick={close}
            />
          </div>

          <div className="flex items-center gap-1">
            <InputGroup className="h-7 flex-1">
              <InputGroupInput
                value={replacement}
                placeholder="Replace with"
                aria-label="Replace with"
                spellCheck={false}
                className="h-7"
                onChange={(event) => {
                  setReplacement(event.target.value)
                  editor.commands.setReplaceTerm(event.target.value)
                }}
                onKeyDown={(event) =>
                  handleKeyDown(event, () => editor.commands.replace())
                }
              />
            </InputGroup>
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
              Replace all
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function PanelButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  readonly label: string
  readonly icon: IconSvgElement
  readonly disabled?: boolean
  readonly onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            <HugeiconsIcon icon={icon} />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
