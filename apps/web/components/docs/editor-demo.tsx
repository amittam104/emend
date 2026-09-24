"use client"

import { createFetchTransport } from "@emend/ai/transport"
import { EmendEditorBase } from "@emend/registry-components/blocks/emend-editor-base"
import { EmendEditorComposer } from "@emend/registry-components/blocks/emend-editor-composer"
import { EmendEditorAssistant } from "@emend/registry-components/blocks/emend-editor-assistant"
import { EmendEditor } from "@emend/registry-components/blocks/emend-editor"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { JSONContent } from "@tiptap/core"
import { useState } from "react"

import { DocsDemo } from "./docs-demo"
import {
  assistantContent,
  baseContent,
  bubbleContent,
  composerContent,
} from "./editor-demo-content"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const transport = createFetchTransport({ url: "/api/editor-ai" })

const variants = {
  bubble: "AI Bubble Menu",
  none: "No AI",
  composer: "AI Composer",
  chat: "AI Assistant",
} as const

type DemoVariant = keyof typeof variants

const demoContent: Record<DemoVariant, JSONContent> = {
  bubble: bubbleContent,
  none: baseContent,
  composer: composerContent,
  chat: assistantContent,
}

interface EditorDemoProps {
  readonly variant?: DemoVariant
  readonly variantPicker?: boolean
  readonly showToolbarAssistantToggle?: boolean
}

export function EditorDemo({
  variant = "bubble",
  variantPicker = false,
  showToolbarAssistantToggle = false,
}: EditorDemoProps) {
  const [activeVariant, setActiveVariant] = useState(variant)
  const [revision, setRevision] = useState(0)

  return (
    <DocsDemo
      title={
        variantPicker ? "Editor starter previews" : `${variants[variant]} demo`
      }
      action={
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Reset demo"
                onClick={() => setRevision((value) => value + 1)}
              >
                <HugeiconsIcon icon={RefreshIcon} />
              </Button>
            }
          />
          <TooltipContent>Reset demo</TooltipContent>
        </Tooltip>
      }
    >
      {variantPicker ? (
        <fieldset className="flex flex-wrap gap-2 border-b px-4 py-3 sm:px-5">
          <legend className="sr-only">Editor starter preview</legend>
          {(Object.entries(variants) as [DemoVariant, string][]).map(
            ([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={activeVariant === value ? "default" : "outline"}
                aria-pressed={activeVariant === value}
                onClick={() => setActiveVariant(value)}
              >
                {label}
              </Button>
            )
          )}
        </fieldset>
      ) : null}
      <div
        className={cn(
          "min-h-[48rem] overflow-hidden",
          activeVariant === "chat"
            ? showToolbarAssistantToggle
              ? "h-[60rem]"
              : "h-[84rem]"
            : "h-[64rem]"
        )}
      >
        <DemoEditor
          key={`${activeVariant}-${revision}`}
          variant={activeVariant}
          showToolbarAssistantToggle={showToolbarAssistantToggle}
        />
      </div>
    </DocsDemo>
  )
}

function DemoEditor({
  variant,
  showToolbarAssistantToggle,
}: {
  readonly variant: DemoVariant
  readonly showToolbarAssistantToggle: boolean
}) {
  const props = { initialContent: demoContent[variant] }

  if (variant === "none") return <EmendEditorBase {...props} />
  if (variant === "composer")
    return <EmendEditorComposer {...props} transport={transport} />
  if (variant === "chat")
    return (
      <EmendEditorAssistant
        {...props}
        transport={transport}
        showToolbarAssistantToggle={showToolbarAssistantToggle}
      />
    )

  return <EmendEditor {...props} transport={transport} />
}
