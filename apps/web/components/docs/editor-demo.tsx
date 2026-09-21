"use client"

import { createMockTransport } from "@emend/ai/transport"
import { EmendEditorBase } from "@emend/registry-components/blocks/emend-editor-base"
import { EmendEditorComposer } from "@emend/registry-components/blocks/emend-editor-composer"
import { EmendEditorSideChat } from "@emend/registry-components/blocks/emend-editor-side-chat"
import type { JSONContent } from "@tiptap/core"
import { EmendEditor } from "@emend/registry-components/blocks/emend-editor"
import { useState } from "react"

import { DocsDemo } from "./docs-demo"
import { Button } from "@/components/ui/button"

const transport = createMockTransport({ delayMs: 12 })
const initialContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Write with a visible review step" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Select this sentence to ask a question or propose a clearer edit.",
        },
      ],
    },
  ],
}

const variants = {
  bubble: "AI Bubble Menu",
  none: "No AI",
  composer: "AI Composer",
  chat: "AI Side Chat",
} as const

type DemoVariant = keyof typeof variants

interface EditorDemoProps {
  readonly variant?: DemoVariant
  readonly variantPicker?: boolean
}

export function EditorDemo({
  variant = "bubble",
  variantPicker = false,
}: EditorDemoProps) {
  const [activeVariant, setActiveVariant] = useState(variant)
  const [revision, setRevision] = useState(0)

  return (
    <DocsDemo
      title={
        variantPicker ? "Editor starter previews" : `${variants[variant]} demo`
      }
      description="This is the shipped Emend UI using a deterministic local transport. No provider key is used."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRevision((value) => value + 1)}
        >
          Reset demo
        </Button>
      }
    >
      {variantPicker ? (
        <fieldset className="mb-3 flex flex-wrap gap-2">
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
      <div className="h-[32rem] max-h-[70vh] min-h-[24rem] overflow-hidden rounded-xl">
        <DemoEditor
          key={`${activeVariant}-${revision}`}
          variant={activeVariant}
        />
      </div>
    </DocsDemo>
  )
}

function DemoEditor({ variant }: { readonly variant: DemoVariant }) {
  const props = { initialContent }

  if (variant === "none") return <EmendEditorBase {...props} />
  if (variant === "composer")
    return <EmendEditorComposer {...props} transport={transport} />
  if (variant === "chat")
    return <EmendEditorSideChat {...props} transport={transport} />

  return <EmendEditor {...props} transport={transport} />
}
