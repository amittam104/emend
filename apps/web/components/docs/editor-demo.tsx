"use client"

import { createMockTransport } from "@emend/ai/transport"
import type { JSONContent } from "@tiptap/core"
import { EmendEditor } from "@emend/registry-components/blocks/emend-editor"

import { DocsDemo } from "./docs-demo"

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

export function EditorDemo() {
  return (
    <DocsDemo
      title="Live mock demo"
      description="This is the real Emend editor starter using the deterministic local transport."
    >
      <div className="h-[32rem] max-h-[70vh] min-h-[24rem] overflow-hidden rounded-xl">
        <EmendEditor initialContent={initialContent} transport={transport} />
      </div>
    </DocsDemo>
  )
}
