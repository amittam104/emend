"use client"

import type { Editor } from "@tiptap/core"
import { PaintBucketIcon, TextColorIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRef, useState, type ReactElement } from "react"
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/emend/color-picker"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const colorControls = {
  text: { label: "Text color", icon: TextColorIcon, reset: "Default color" },
  background: {
    label: "Background color",
    icon: PaintBucketIcon,
    reset: "No background",
  },
} as const

export function EditorColorControl({
  editor,
  type,
  color,
  trigger,
  strokeWidth,
}: {
  readonly editor: Editor
  readonly type: keyof typeof colorControls
  readonly color: string | null
  readonly trigger: (active: boolean) => ReactElement
  readonly strokeWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const historyGroup = useRef({})
  const { label, icon, reset } = colorControls[type]

  // Mark-only steps never count as adjacent in ProseMirror history, so every
  // drag tick would become its own undo event. A shared composition id merges
  // all changes made while this picker is open into one event.
  function applyColor(value: string) {
    const chain = editor.chain().setMeta("composition", historyGroup.current)
    if (type === "text") chain.setColor(value).run()
    else chain.setBackgroundColor(value).run()
  }

  function resetColor() {
    setOpen(false)
    if (type === "text") editor.chain().focus().unsetColor().run()
    else editor.chain().focus().unsetBackgroundColor().run()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) historyGroup.current = {}
        setOpen(nextOpen)
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={trigger(Boolean(color))}
              aria-label={label}
              onMouseDown={(event) => event.preventDefault()}
            />
          }
        >
          <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} />
          {color && (
            <span
              aria-hidden
              className="absolute inset-x-[22%] bottom-[12%] h-0.5 rounded-full"
              style={{ background: color }}
            />
          )}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        aria-label={label}
        className="w-64"
        finalFocus={(closeType) => {
          if (closeType === "keyboard") editor.commands.focus()
          return false
        }}
      >
        <ColorPicker
          value={color ?? undefined}
          defaultValue={type === "text" ? "#000000" : "#fff3a3"}
          onChange={applyColor}
          className="gap-3"
        >
          <ColorPickerSelection className="h-36" />
          <div className="flex items-center gap-3">
            <ColorPickerEyeDropper />
            <div className="grid w-full gap-2">
              <ColorPickerHue />
              <ColorPickerAlpha />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ColorPickerOutput />
            <ColorPickerFormat />
          </div>
        </ColorPicker>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!color}
          onClick={resetColor}
        >
          {reset}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
