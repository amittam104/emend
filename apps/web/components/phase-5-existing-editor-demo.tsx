"use client"

import type { JSONContent } from "@tiptap/core"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { BackgroundColor, Color, TextStyle } from "@tiptap/extension-text-style"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useMemo, useState } from "react"
import { useEditorAi } from "@emend/registry-components/components/_shared/use-emend-ai-session"
import { createFetchTransport } from "@emend/ai/transport"
import { EmendAi, getTiptapSourceRevision } from "@emend/ai/tiptap"
import { AiBubbleMenuView } from "@emend/registry-components/components/ai-bubble-menu"

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

const demoDocument: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Existing editor integration" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Select this paragraph, run Edit, and review the proposal carefully before accepting it in one deliberate step.",
        },
      ],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Preview remains outside the document." },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            tableCell("tableHeader", "Check"),
            tableCell("tableHeader", "Result"),
          ],
        },
        {
          type: "tableRow",
          content: [
            tableCell("tableCell", "Accept"),
            tableCell("tableCell", "One undoable change"),
          ],
        },
      ],
    },
  ],
}

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
  const currentRevision = getTiptapSourceRevision(configuredEditor)
  const currentJson = JSON.stringify(configuredEditor.getJSON(), null, 2)
  const capturedRange = session.activeRequest?.targetRange
  const pinnedRange = session.editorState?.targetRange

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
        <div>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Consumer-owned editor
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold">
            Existing-editor onboarding
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            This demo owns the editor and transport. Emend only adds its
            extension, session hook, target decoration, and review workflow.
          </p>
        </div>

        <div className="phase-5-editor rounded-xl border border-input bg-background p-4">
          <EditorContent editor={configuredEditor} />
          <AiBubbleMenuView editor={configuredEditor} session={session} />
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
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
      </section>
    </div>
  )
}

export function tableCell(
  type: "tableCell" | "tableHeader",
  value: string
): JSONContent {
  return {
    type,
    attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: value }],
      },
    ],
  }
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

function formatRange(
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
}

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function buttonClass(variant: "outline" | "primary"): string {
  const base =
    "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
  return variant === "primary"
    ? `${base} border-primary bg-primary text-primary-foreground hover:bg-primary/80`
    : `${base} border-border bg-background hover:bg-muted`
}
