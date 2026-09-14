"use client"

import { useEditorAi } from "@emend/ai/react"
import { EmendAi } from "@emend/ai/tiptap"
import { createFetchTransport } from "@emend/ai/transport"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useState } from "react"
import { AiBubbleMenuView } from "@/components/emend/ai-bubble-menu"
import { AiComposerView } from "@/components/emend/ai-composer"
import { AiSideChatView } from "@/components/emend/ai-side-chat"

const transport = createFetchTransport({ url: "/api/demo-ai" })

export function ExistingEditor() {
  const [chatOpen, setChatOpen] = useState(true)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Markdown, EmendAi],
    content:
      "<h1>Consumer-owned editor</h1><p>Select this sentence, ask a question, or request an edit.</p><p>Every edit stays reviewable until you accept it.</p>",
  })
  const session = useEditorAi({ editor, transport, previewMode: "inline" })

  useEffect(() => {
    if (!editor) return
    const from = editor.state.doc.child(0).nodeSize + 1
    editor.commands.setTextSelection({
      from,
      to: from + editor.state.doc.child(1).content.size,
    })
  }, [editor])

  if (!editor) return <p>Loading editor…</p>

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Existing editor installation</h1>
        <button
          className="rounded-lg border px-3 py-2 text-sm"
          type="button"
          onClick={() => setChatOpen((open) => !open)}
        >
          AI chat
        </button>
      </div>
      <div className="grid min-h-[36rem] overflow-hidden rounded-xl border md:grid-cols-[1fr_22rem]">
        <div className="relative p-6 pb-28">
          <EditorContent editor={editor} />
          <AiBubbleMenuView editor={editor} session={session} />
          <div className="absolute inset-x-4 bottom-4">
            <AiComposerView editor={editor} session={session} />
          </div>
        </div>
        <AiSideChatView
          editor={editor}
          session={session}
          inline
          open={chatOpen}
          onOpenChange={setChatOpen}
          panelClassName="border-l"
        />
      </div>
    </section>
  )
}
