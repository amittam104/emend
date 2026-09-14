"use client"

import type { Editor } from "@tiptap/core"
import type { EmendTransport } from "@emend/ai"
import { useEditorAi } from "@emend/ai/react"
import { EmendAi } from "@emend/ai/tiptap"
import { useMemo, useState, type ReactNode } from "react"
import { AiSideChatView } from "@/components/emend/ai-side-chat/ai-side-chat"
import { EmendEditorBase, type EmendEditorBaseProps } from "./emend-editor-base"
import { EditorBubbleMenu } from "./editor-bubble-menu"

export interface EmendEditorSideChatProps extends Omit<
  EmendEditorBaseProps,
  "renderWorkspace" | "onSideChatToggle" | "sideChatOpen"
> {
  readonly transport?: EmendTransport
}

export function EmendEditorSideChat({
  transport,
  ...props
}: EmendEditorSideChatProps) {
  const extensions = useMemo(
    () => [EmendAi, ...(props.extensions ?? [])],
    [props.extensions]
  )
  const [open, setOpen] = useState(false)
  return (
    <EmendEditorBase
      {...props}
      extensions={extensions}
      onSideChatToggle={
        transport ? () => setOpen((value) => !value) : undefined
      }
      sideChatOpen={open}
      renderWorkspace={
        transport
          ? (editor, content) => (
              <EditorAi
                editor={editor}
                transport={transport}
                open={open}
                onOpenChange={setOpen}
              >
                {content}
              </EditorAi>
            )
          : undefined
      }
    />
  )
}

function EditorAi({
  children,
  editor,
  transport,
  open,
  onOpenChange,
}: {
  readonly children: ReactNode
  readonly editor: Editor
  readonly transport: EmendTransport
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })
  return (
    <div className="emend-editor__workspace" data-side-chat-open={open}>
      <div className="emend-editor__main">
        <div className="emend-editor__content">{children}</div>
        <EditorBubbleMenu editor={editor} />
      </div>
      <AiSideChatView
        editor={editor}
        session={session}
        inline
        open={open}
        onOpenChange={onOpenChange}
        panelClassName="emend-editor__side-chat"
      />
    </div>
  )
}
