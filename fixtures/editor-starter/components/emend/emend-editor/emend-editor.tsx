"use client"

import type { Editor } from "@tiptap/core"
import type { EmendTransport } from "@emend/ai"
import { useEditorAi } from "@emend/ai/react"
import { EmendAi } from "@emend/ai/tiptap"
import { useMemo, type ReactNode } from "react"
import { AiBubbleMenuView } from "@/components/emend/ai-bubble-menu/ai-bubble-menu"
import { EmendEditorBase, type EmendEditorBaseProps } from "./emend-editor-base"

export interface EmendEditorProps extends Omit<
  EmendEditorBaseProps,
  "renderWorkspace" | "onSideChatToggle" | "sideChatOpen"
> {
  readonly transport?: EmendTransport
}

export function EmendEditor({ transport, ...props }: EmendEditorProps) {
  const extensions = useMemo(
    () => [EmendAi, ...(props.extensions ?? [])],
    [props.extensions]
  )
  return (
    <EmendEditorBase
      {...props}
      extensions={extensions}
      renderWorkspace={
        transport
          ? (editor, content) => (
              <EditorAi editor={editor} transport={transport}>
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
}: {
  readonly children: ReactNode
  readonly editor: Editor
  readonly transport: EmendTransport
}) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })
  return (
    <div className="emend-editor__workspace">
      <div className="emend-editor__main">
        <div className="emend-editor__content">{children}</div>
        <AiBubbleMenuView editor={editor} session={session} />
      </div>
    </div>
  )
}
