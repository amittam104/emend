"use client"

import { useState } from "react"
import type { JSONContent } from "@tiptap/core"
import { createFetchTransport } from "@emend/ai/transport"
import { EmendEditor } from "@/components/emend/emend-editor"

import { EmendEditorBase } from "@/components/emend/emend-editor/emend-editor-base"
import { EmendEditorComposer } from "@/components/emend/emend-editor/emend-editor-composer"
import { EmendEditorSideChat } from "@/components/emend/emend-editor/emend-editor-side-chat"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const starters = {
  bubble: { label: "AI Bubble Menu (default)", component: EmendEditor },
  none: { label: "No AI", component: EmendEditorBase },
  chat: { label: "AI Side Chat", component: EmendEditorSideChat },
  composer: { label: "AI Composer", component: EmendEditorComposer },
}

const transport = createFetchTransport({ url: "/api/demo-ai" })

const initialContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "A calmer writing workflow" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Great editing keeps " },
        { type: "text", marks: [{ type: "bold" }], text: "intent clear" },
        { type: "text", text: ", decisions visible, and every change " },
        { type: "text", marks: [{ type: "italic" }], text: "reversible" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Today’s focus" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Shape the first draft" }],
            },
          ],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Review the key message" }],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "The interface should stay quiet until a decision matters.",
            },
          ],
        },
      ],
    },
    {
      type: "codeBlock",
      content: [{ type: "text", text: "review → decide → apply" }],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Surface" }],
                },
              ],
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Best for" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bubble Menu" }],
                },
              ],
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Focused edits" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Side Chat" }],
                },
              ],
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Follow-up questions" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export function EditorStarter() {
  const [choice, setChoice] = useState<keyof typeof starters>("bubble")
  const Starter = starters[choice].component
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Select
        value={choice}
        onValueChange={(value) => {
          if (value && value in starters)
            setChoice(value as keyof typeof starters)
        }}
      >
        <SelectTrigger aria-label="Editor starter" className="w-60">
          <SelectValue>{starters[choice].label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(starters).map(([value, starter]) => (
            <SelectItem key={value} value={value}>
              {starter.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="min-h-0 flex-1">
        <Starter
          key={choice}
          initialContent={initialContent}
          transport={transport}
        />
      </div>
    </div>
  )
}
