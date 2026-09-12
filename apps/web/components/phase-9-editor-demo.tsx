"use client"

import type { JSONContent } from "@tiptap/core"
import { createFetchTransport } from "@emend/ai/transport"
import { EmendEditor } from "@emend/registry-components/blocks/emend-editor"

const transport = createFetchTransport({ url: "/api/editor-ai" })

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

export function Phase9EditorDemo() {
  return <EmendEditor initialContent={initialContent} transport={transport} />
}
