"use client"

import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { BackgroundColor, Color, TextStyle } from "@tiptap/extension-text-style"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useMemo, useState } from "react"
import { useEditorAi } from "@emend/registry-components/components/_shared/use-emend-ai-session"
import { createFetchTransport } from "@emend/ai/transport"
import {
  EmendAi,
  // getTiptapSourceRevision,
} from "@emend/ai/tiptap"
import { AiBubbleMenuView } from "@emend/registry-components/components/ai-bubble-menu"
import { AiComposerView } from "@emend/registry-components/components/ai-composer"
import { Phase5EditorToolbar } from "./phase-5-editor-toolbar"

type MockMode = "normal" | "delayed" | "failing"

const editorExtensions = [
  StarterKit,
  TextStyle,
  Color,
  BackgroundColor,
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit,
  Markdown.configure({ markedOptions: { gfm: true } }),
  EmendAi,
]

const demoDocument = `
  <h1>Editing for clarity, not perfection</h1>
  <p>A strong draft does not need more words. It needs <strong>one clear idea</strong>, a useful structure, and enough space for the reader to follow along.</p>
  <h2>Find the central idea</h2>
  <p>Before polishing sentences, decide what the reader should remember. Every section should support that outcome or make way for something that does.</p>
  <blockquote>A useful edit makes the next thought easier to understand.</blockquote>
  <h2>Make one deliberate pass</h2>
  <p>Work from the largest decisions to the smallest details:</p>
  <ol>
    <li><p>Clarify the main point.</p></li>
    <li><p>Arrange ideas in a natural order.</p></li>
    <li><p>Trim words that do not add meaning.</p></li>
  </ol>
  <h3>Know when to stop</h3>
  <p>Read the piece once more, fix what interrupts the flow, and publish while the writing still feels human.</p>
`

export function Phase5ExistingEditorDemo() {
  const [mockMode, setMockMode] = useState<MockMode>("normal")
  const [previewMode, setPreviewMode] = useState<"inline" | "card">("card")
  const [editorVersion, setEditorVersion] = useState(0)
  const transport = useMemo(
    () =>
      createFetchTransport({
        url:
          mockMode === "normal"
            ? "/api/phase-2"
            : `/api/phase-2?mode=${mockMode}`,
      }),
    [mockMode]
  )
  const editor = useEditor({
    content: demoDocument,
    extensions: editorExtensions,
    immediatelyRender: false,
    onTransaction: () => setEditorVersion((value) => value + 1),
  })
  const session = useEditorAi({ editor, transport, previewMode })

  useEffect(() => {
    if (!editor) return
    const range = findFirstTextRange(editor)
    if (range) editor.commands.setTextSelection(range)
  }, [editor])

  if (!editor) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Mounting the consumer-owned editor…
      </p>
    )
  }

  const configuredEditor = editor
  // const currentRevision = getTiptapSourceRevision(configuredEditor)
  // const currentJson = JSON.stringify(configuredEditor.getJSON(), null, 2)
  // const capturedRange = session.activeRequest?.targetRange
  // const pinnedRange = session.editorState?.targetRange

  function selectFirstParagraph() {
    const range = findFirstTextRange(configuredEditor)
    if (range) configuredEditor.commands.setTextSelection(range)
  }

  function moveSelectionWithoutEditing() {
    configuredEditor.commands.setTextSelection(
      configuredEditor.state.doc.content.size
    )
  }

  function runEdit() {
    void session.run("shorten", {
      interactionMode: "edit",
      targetScope: "selection",
      contextScope: "document",
      mutationOperation: "replace-selection",
    })
  }

  function runAsk() {
    void session.run("summarize", {
      interactionMode: "ask",
      targetScope: "selection",
      contextScope: "document",
      mutationOperation: null,
    })
  }

  return (
    <div className="space-y-6" data-editor-version={editorVersion}>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="phase-5-editor relative overflow-hidden rounded-xl border border-input bg-background">
          <Phase5EditorToolbar editor={configuredEditor} />
          <div className="p-4 pb-36">
            <EditorContent editor={configuredEditor} />
          </div>
          <AiBubbleMenuView
            editor={configuredEditor}
            session={session}
            showReview={false}
          />
          <div className="absolute inset-x-0 bottom-4 z-10 mx-auto w-[calc(100%-2rem)] md:w-[52%]">
            <AiComposerView editor={configuredEditor} session={session} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("outline")}
            onClick={selectFirstParagraph}
          >
            Select sample paragraph
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            onClick={moveSelectionWithoutEditing}
          >
            Move focus/selection without editing
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            onClick={() =>
              configuredEditor.commands.insertContent(" ordinary edit")
            }
          >
            Make ordinary edit
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            onClick={() => configuredEditor.commands.undo()}
          >
            Undo
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            onClick={() => configuredEditor.commands.redo()}
          >
            Redo
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Harness controls
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit creates a reviewable proposal. Ask is informational and never
            applies document content.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium">
            Mock route
            <select
              className={selectClass}
              value={mockMode}
              onChange={(event) => setMockMode(event.target.value as MockMode)}
            >
              <option value="normal">Normal</option>
              <option value="delayed">Delayed</option>
              <option value="failing">Failing</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Preview mode
            <select
              className={selectClass}
              value={previewMode}
              onChange={(event) =>
                setPreviewMode(event.target.value as "inline" | "card")
              }
            >
              <option value="card">Card target only</option>
              <option value="inline">Inline preview</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              className={buttonClass("primary")}
              disabled={
                session.state === "submitting" || session.state === "streaming"
              }
              onClick={runEdit}
            >
              Run Edit
            </button>
            <button
              type="button"
              className={buttonClass("outline")}
              disabled={
                session.state === "submitting" || session.state === "streaming"
              }
              onClick={runAsk}
            >
              Run Ask
            </button>
          </div>
        </div>
      </section>

      {/* <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold">
            Revision evidence
          </h2>
          <dl className="grid gap-3 text-sm">
            <EvidenceRow label="Session state" value={session.state} />
            <EvidenceRow
              label="Current revision"
              value={
                currentRevision.ok
                  ? `${currentRevision.revision.counter} / ${currentRevision.revision.fingerprint}`
                  : currentRevision.error.code
              }
            />
            <EvidenceRow
              label="Captured target"
              value={formatRange(capturedRange)}
            />
            <EvidenceRow
              label="Pinned target"
              value={formatRange(pinnedRange)}
            />
            <EvidenceRow
              label="Plugin revision"
              value={String(session.editorState?.revisionCounter ?? "none")}
            />
            <EvidenceRow label="Stale" value={session.stale ? "yes" : "no"} />
            <EvidenceRow
              label="Preview kind"
              value={session.editorState?.previewKind ?? "none"}
            />
            <EvidenceRow
              label="Preparation"
              value={session.preparation?.kind ?? "none"}
            />
            <EvidenceRow
              label="User modified"
              value={
                session.preparation && "userModified" in session.preparation
                  ? session.preparation.userModified
                    ? "yes"
                    : "no"
                  : "none"
              }
            />
          </dl>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Current editor JSON
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview and target decorations do not change this JSON. Accept,
              ordinary edits, Undo, and Redo make the document changes visible.
            </p>
          </div>
          <pre className="max-h-128 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {currentJson}
          </pre>
        </div>
      </section> */}
    </div>
  )
}

function findFirstTextRange(
  editor: NonNullable<ReturnType<typeof useEditor>>
): { readonly from: number; readonly to: number } | null {
  let result: { readonly from: number; readonly to: number } | null = null
  let fallback: { readonly from: number; readonly to: number } | null = null
  editor.state.doc.descendants((node, position) => {
    if (!result && node.type.name === "paragraph" && node.content.size > 0) {
      result = {
        from: position + 1,
        to: position + node.nodeSize - 1,
      }
      return false
    }
    if (!fallback && node.isText && node.text) {
      fallback = { from: position, to: position + node.nodeSize }
    }
    return true
  })
  return result ?? fallback
}

/* function formatRange(
  range: { readonly from: number; readonly to: number } | null | undefined
): string {
  return range ? `${range.from}–${range.to}` : "none"
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs wrap-break-word">{value}</dd>
    </div>
  )
} */

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function buttonClass(variant: "outline" | "primary"): string {
  const base =
    "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
  return variant === "primary"
    ? `${base} border-primary bg-primary text-primary-foreground hover:bg-primary/80`
    : `${base} border-border bg-background hover:bg-muted`
}
