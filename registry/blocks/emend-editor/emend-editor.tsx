"use client"

import type {
  Editor,
  EditorOptions,
  Extensions,
  JSONContent,
} from "@tiptap/core"
import type { EmendTransport } from "@emend/ai"
import { useEditorAi } from "@emend/ai/react"
import { EditorContent, useEditor } from "@tiptap/react"
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { AiBubbleMenuView } from "../../components/ai-bubble-menu"
import { AiComposerView } from "../../components/ai-composer"
import { AiSideChatView } from "../../components/ai-side-chat"
import { EditorBubbleMenu } from "./editor-bubble-menu"
import { EditorToolbar } from "./editor-toolbar"
import { createEmendEditorExtensions } from "./extensions"
import "./emend-editor.css"

export interface EmendEditorProps {
  readonly initialContent?: JSONContent
  readonly placeholder?: string
  readonly editable?: boolean
  readonly extensions?: Extensions
  readonly editorProps?: EditorOptions["editorProps"]
  readonly onChange?: (content: {
    readonly json: JSONContent
    readonly html: string
  }) => void
  readonly onEditorReady?: (editor: Editor) => void
  readonly onSave?: (editor: Editor) => void | Promise<void>
  readonly transport?: EmendTransport
}

export function EmendEditor({
  initialContent,
  placeholder = "Start writing…",
  editable = true,
  extensions,
  editorProps,
  onChange,
  onEditorReady,
  onSave,
  transport,
}: EmendEditorProps) {
  const [characterCount, setCharacterCount] = useState(0)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle")
  const [sideChatOpen, setSideChatOpen] = useState(false)
  const configuredExtensions = useMemo(
    () => [...createEmendEditorExtensions(placeholder), ...(extensions ?? [])],
    [extensions, placeholder]
  )
  const editor = useEditor({
    content: initialContent,
    extensions: configuredExtensions,
    editorProps: editorProps ?? {},
    editable,
    immediatelyRender: false,
    onCreate: ({ editor: currentEditor }) => {
      setCharacterCount(currentEditor.storage.characterCount.characters())
      onEditorReady?.(currentEditor)
    },
    onUpdate: ({ editor: currentEditor }) => {
      setCharacterCount(currentEditor.storage.characterCount.characters())
      setSaveStatus("idle")
      onChange?.({
        json: currentEditor.getJSON(),
        html: currentEditor.getHTML(),
      })
    },
  })

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable, false)
    }
  }, [editable, editor])

  async function save() {
    if (!editor || !onSave || !editable || saveStatus === "saving") return

    setSaveStatus("saving")
    try {
      await onSave(editor)
      setSaveStatus("success")
    } catch {
      setSaveStatus("error")
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      onSave &&
      editable &&
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "s"
    ) {
      event.preventDefault()
      void save()
    }
  }

  return (
    <section className="emend-editor" onKeyDown={handleKeyDown}>
      {editor && editable && (
        <EditorToolbar
          editor={editor}
          onSave={onSave ? save : undefined}
          onSideChatToggle={
            transport ? () => setSideChatOpen((open) => !open) : undefined
          }
          saveDisabled={saveStatus === "saving"}
          saveStatus={saveStatus}
          sideChatOpen={sideChatOpen}
        />
      )}
      {editor && editable && transport ? (
        <EditorAi
          editor={editor}
          transport={transport}
          sideChatOpen={sideChatOpen}
          onSideChatOpenChange={setSideChatOpen}
        >
          <EditorContent editor={editor} />
        </EditorAi>
      ) : (
        <div className="emend-editor__workspace">
          <div className="emend-editor__main">
            <div className="emend-editor__content">
              <EditorContent editor={editor} />
            </div>
            {editor && editable && <EditorBubbleMenu editor={editor} />}
          </div>
        </div>
      )}
      <footer className="emend-editor__footer">
        <span>{editor ? (editable ? "Ready" : "Read only") : "Loading…"}</span>
        {editor && <span>{characterCount} characters</span>}
      </footer>
    </section>
  )
}

function EditorAi({
  children,
  editor,
  onSideChatOpenChange,
  sideChatOpen,
  transport,
}: {
  readonly children: ReactNode
  readonly editor: Editor
  readonly onSideChatOpenChange: (open: boolean) => void
  readonly sideChatOpen: boolean
  readonly transport: EmendTransport
}) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })

  return (
    <div className="emend-editor__workspace" data-side-chat-open={sideChatOpen}>
      <div className="emend-editor__main emend-editor__main--ai">
        <div className="emend-editor__content">{children}</div>
        <AiBubbleMenuView
          editor={editor}
          session={session}
          showReview={false}
        />
        <div className="emend-editor__ai-tools">
          <AiComposerView
            editor={editor}
            session={session}
            showReview={!sideChatOpen}
          />
        </div>
      </div>
      <AiSideChatView
        editor={editor}
        session={session}
        inline
        open={sideChatOpen}
        onOpenChange={onSideChatOpenChange}
        panelClassName="emend-editor__side-chat"
      />
    </div>
  )
}
