"use client"

import type {
  Editor,
  EditorOptions,
  Extensions,
  JSONContent,
} from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { EditorBubbleMenu } from "./editor-bubble-menu"
import { EditorToolbar } from "./editor-toolbar"
import { createEmendEditorExtensions } from "./extensions"
import "./emend-editor.css"

export interface EmendEditorBaseProps {
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
  readonly renderWorkspace?: (editor: Editor, content: ReactNode) => ReactNode
  readonly onSideChatToggle?: () => void
  readonly sideChatOpen?: boolean
}

export function EmendEditorBase({
  initialContent,
  placeholder = "Start writing…",
  editable = true,
  extensions,
  editorProps,
  onChange,
  onEditorReady,
  onSave,
  renderWorkspace,
  onSideChatToggle,
  sideChatOpen,
}: EmendEditorBaseProps) {
  const [characterCount, setCharacterCount] = useState(0)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle")
  const documentVersion = useRef(0)
  const saveInFlight = useRef(false)
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
      documentVersion.current += 1
      setCharacterCount(currentEditor.storage.characterCount.characters())
      if (!saveInFlight.current) setSaveStatus("idle")
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
    if (!editor || !onSave || !editable || saveInFlight.current) return

    const savedVersion = documentVersion.current
    saveInFlight.current = true
    setSaveStatus("saving")
    try {
      await onSave(editor)
      if (savedVersion === documentVersion.current) setSaveStatus("success")
    } catch {
      if (savedVersion === documentVersion.current) setSaveStatus("error")
    } finally {
      saveInFlight.current = false
      if (savedVersion !== documentVersion.current) setSaveStatus("idle")
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
          onSideChatToggle={onSideChatToggle}
          saveDisabled={saveStatus === "saving"}
          saveStatus={saveStatus}
          sideChatOpen={sideChatOpen}
        />
      )}
      {editor && editable && renderWorkspace ? (
        renderWorkspace(editor, <EditorContent editor={editor} />)
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
