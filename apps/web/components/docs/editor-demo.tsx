"use client"

import { createMockTransport } from "@emend/ai/transport"
import { EmendEditorBase } from "@emend/registry-components/blocks/emend-editor-base"
import { EmendEditorComposer } from "@emend/registry-components/blocks/emend-editor-composer"
import { EmendEditorAssistant } from "@emend/registry-components/blocks/emend-editor-assistant"
import type { JSONContent } from "@tiptap/core"
import { EmendEditor } from "@emend/registry-components/blocks/emend-editor"
import { useState } from "react"

import { DocsDemo } from "./docs-demo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
})

const assistantContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "A clearer way to write together" }],
    },
    paragraph(
      "Good writing starts with a useful draft, not a perfect one. Put the idea on the page, then decide what your reader needs to understand, feel, or do next. The AI Assistant can help you explore that question while the document stays in view."
    ),
    paragraph(
      "Select a sentence to try Improve, Shorten, Longer, Fix grammar, or Tone. Each Edit action proposes a change for review. You can accept it, reject it, or keep writing before making a decision."
    ),
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Make the next pass count" }],
    },
    paragraph(
      "Imagine you are preparing a short note for a project team. The first paragraph explains the goal, but the middle buries the decision under background detail. Ask the assistant what feels unclear. Then select the sentence that carries the decision and ask for a more direct version."
    ),
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [paragraph("Lead with the decision readers need to make.")],
        },
        {
          type: "listItem",
          content: [
            paragraph(
              "Keep the supporting detail close to the claim it supports."
            ),
          ],
        },
        {
          type: "listItem",
          content: [paragraph("Use a tone that fits the people reading it.")],
        },
      ],
    },
    paragraph(
      "Try a follow-up in the same chat: ask for an example, challenge an assumption, or request a shorter explanation. The conversation keeps its context, while every proposed document edit still waits for your approval."
    ),
  ],
}

const variants = {
  bubble: "AI Bubble Menu",
  none: "No AI",
  composer: "AI Composer",
  chat: "AI Assistant",
} as const

type DemoVariant = keyof typeof variants

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
      <div
        className={cn(
          "min-h-[24rem] overflow-hidden rounded-xl",
          activeVariant === "chat"
            ? showToolbarAssistantToggle
              ? "h-[30rem]"
              : "h-[42rem]"
            : "h-[32rem] max-h-[70vh]"
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
  const props = {
    initialContent: variant === "chat" ? assistantContent : initialContent,
  }

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
