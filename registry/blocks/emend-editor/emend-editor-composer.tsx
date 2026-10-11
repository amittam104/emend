"use client"

import type { Editor } from "@tiptap/core"
import type { EmendTransport } from "@emend/ai"
import { useEditorAi } from "@emend/ai/react"
import { EmendAi } from "@emend/ai/tiptap"
import { useMemo, useState, type ReactNode } from "react"
import { AiComposerView } from "@/components/emend/ai-composer"
import { cn } from "@/lib/utils"
import { EmendEditorBase, type EmendEditorBaseProps } from "./emend-editor-base"
import { createEmendContextProjection } from "./extensions"

export interface EmendEditorComposerProps extends Omit<
  EmendEditorBaseProps,
  | "renderWorkspace"
  | "onAssistantToggle"
  | "assistantOpen"
  | "onComposerToggle"
  | "composerOpen"
> {
  readonly transport?: EmendTransport
  readonly showToolbarComposerToggle?: boolean
}

export function EmendEditorComposer({
  transport,
  showToolbarComposerToggle = true,
  ...props
}: EmendEditorComposerProps) {
  const extensions = useMemo(
    () => [EmendAi, ...(props.extensions ?? [])],
    [props.extensions]
  )
  const [open, setOpen] = useState(true)
  return (
    <EmendEditorBase
      {...props}
      extensions={extensions}
      onComposerToggle={
        transport && showToolbarComposerToggle
          ? () => setOpen((value) => !value)
          : undefined
      }
      composerOpen={open}
      renderWorkspace={
        transport
          ? (editor, content) => (
              <EditorAi editor={editor} transport={transport} open={open}>
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
}: {
  readonly children: ReactNode
  readonly editor: Editor
  readonly transport: EmendTransport
  readonly open: boolean
}) {
  const contextProjection = useMemo(
    () => createEmendContextProjection(editor),
    [editor]
  )
  const session = useEditorAi({
    editor,
    transport,
    previewMode: "inline",
    contextProjection,
  })
  return (
    <div className="emend-editor__workspace">
      <div
        className={cn("emend-editor__main", open && "emend-editor__main--ai")}
      >
        <div className="emend-editor__content">{children}</div>
        <div className="emend-editor__ai-tools" hidden={!open}>
          <AiComposerView editor={editor} session={session} />
        </div>
      </div>
    </div>
  )
}
