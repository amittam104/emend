"use client"

import type { Editor } from "@tiptap/core"
import type { EmendTransport } from "@emend/ai"
import { useEditorAi } from "@emend/ai/react"
import { EmendAi } from "@emend/ai/tiptap"
import { useMemo, useState, type ReactNode } from "react"
import { AiAssistantView } from "@/components/emend/ai-assistant"
import { EmendEditorBase, type EmendEditorBaseProps } from "./emend-editor-base"
import { EditorBubbleMenu } from "./editor-bubble-menu"

export interface EmendEditorAssistantProps extends Omit<
  EmendEditorBaseProps,
  "renderWorkspace" | "onSideChatToggle" | "sideChatOpen"
> {
  readonly transport?: EmendTransport
  readonly storageKey?: string
  readonly showToolbarAssistantToggle?: boolean
}

export function EmendEditorAssistant({
  transport,
  storageKey = "emend:editor-assistant:v1",
  showToolbarAssistantToggle = false,
  ...props
}: EmendEditorAssistantProps) {
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
        transport && showToolbarAssistantToggle
          ? () => setOpen((value) => !value)
          : undefined
      }
      sideChatOpen={open}
      renderWorkspace={
        transport
          ? (editor, content) => (
              <EditorAi
                editor={editor}
                transport={transport}
                storageKey={storageKey}
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
  storageKey,
}: {
  readonly children: ReactNode
  readonly editor: Editor
  readonly transport: EmendTransport
  readonly storageKey: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })
  return (
    <div className="emend-editor__workspace">
      <div className="emend-editor__main">
        <div className="emend-editor__content">{children}</div>
        <EditorBubbleMenu editor={editor} />
      </div>
      <AiAssistantView
        editor={editor}
        session={session}
        open={open}
        onOpenChange={onOpenChange}
        storageKey={storageKey}
        className="absolute right-4 bottom-4"
      />
    </div>
  )
}
