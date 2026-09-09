"use client"

import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { BackgroundColor, Color, TextStyle } from "@tiptap/extension-text-style"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useMemo, useState } from "react"
import { useEditorAi } from "@emend/registry-components/components/_shared/use-emend-ai-session"
import { createFetchTransport } from "@emend/ai/transport"
import {
  EmendAi,
  // getTiptapSourceRevision,
} from "@emend/ai/tiptap"
import { AiBubbleMenuView } from "@emend/registry-components/components/ai-bubble-menu"
import { AiComposerView } from "@emend/registry-components/components/ai-composer"
import { AiSideChatView } from "@emend/registry-components/components/ai-side-chat"
import { Button } from "@workspace/ui/components/button"
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
  <h1>Designing a calmer AI editing workflow</h1>
  <p>Writers rarely need another blank page. They need a reliable way to improve a draft without losing its meaning, structure, or voice. Our goal is to make every AI-assisted edit feel <strong>clear, deliberate, and reversible</strong>.</p>
  <p>The first release focuses on reviewable changes inside an existing editor. It keeps the document in the writer's hands while using AI for the parts that benefit from a second perspective: clarity, structure, tone, and grammar.</p>

  <h2>The problem we are solving</h2>
  <p>Many writing tools make a change before the writer can understand its effect. That approach is fast, but it also creates uncertainty. A user should be able to ask a question, compare a proposal, and decide what belongs in the document.</p>
  <blockquote>A useful AI edit should reduce uncertainty, not move it somewhere else.</blockquote>
  <p>That principle leads to a simple boundary: <u>informational answers never change the document</u>, and <s>silent replacement</s> is not part of the workflow. An edit becomes real only after the writer accepts it.</p>

  <h2>Product principles</h2>
  <ul>
    <li><p><strong>Keep context visible.</strong> The writer should see the source text and the proposed change together.</p></li>
    <li><p><strong>Preserve intent.</strong> Broader reading context may improve an answer, but it must not widen what the AI is allowed to replace.</p></li>
    <li><p><strong>Make recovery ordinary.</strong> Reject, retry, undo, and redo should feel like normal editing actions.</p></li>
    <li><p><strong>Use familiar controls.</strong> Keyboard navigation and accessible labels matter as much as visual polish.</p></li>
  </ul>

  <h3>A reviewable edit in four steps</h3>
  <ol>
    <li><p>Select the sentence or section that needs attention.</p></li>
    <li><p>Choose a writing action or enter a custom instruction.</p></li>
    <li><p>Review the response in context, including any warnings or fallback behavior.</p></li>
    <li><p>Accept the proposal once, or reject it without changing the document.</p></li>
  </ol>

  <h2>Interaction notes for the first release</h2>
  <p>The Bubble Menu is best for focused selection edits. AI Composer handles broader instructions. AI Side Chat adds a conversational place to ask follow-up questions while sharing the same proposal and apply path.</p>
  <p>Consumers configure the transport with a small, provider-neutral endpoint such as <code>/api/edit</code>. The editor keeps canonical content; streamed Markdown remains a proposal until acceptance.</p>
  <pre><code>const session = useEditorAi({
  editor,
  transport,
  previewMode: "inline",
})</code></pre>

  <hr>
  <h2>What success looks like</h2>
  <p>A writer can move from a rough paragraph to a stronger one without wondering what changed or how to get back. The interface stays quiet when it is not needed and gives the writer <em>just enough control</em> when a decision matters. Read more in the <a href="https://tiptap.dev/">editor documentation</a>.</p>
`

export function Phase5ExistingEditorDemo() {
  const [mockMode, setMockMode] = useState<MockMode>("normal")
  const [previewMode, setPreviewMode] = useState<"inline" | "card">("card")
  const [sideChatOpen, setSideChatOpen] = useState(false)
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
      <section className="phase-5-editor relative h-[calc(100svh-10rem)] max-h-208 min-h-168 overflow-hidden border border-border bg-background">
        <div
          className={`grid h-full min-w-0 ${
            sideChatOpen
              ? "md:grid-cols-[minmax(0,1fr)_minmax(20rem,40%)] lg:grid-cols-[minmax(0,1fr)_28rem]"
              : ""
          }`}
        >
          <div className="relative min-w-0 overflow-hidden">
            <Phase5EditorToolbar
              editor={configuredEditor}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={sideChatOpen}
                  className="h-8 gap-2 bg-background shadow-none"
                  onClick={() => setSideChatOpen((current) => !current)}
                >
                  <HugeiconsIcon icon={AiChat02Icon} size={16} />
                  AI Chat
                </Button>
              }
            />
            <div className="h-[calc(100%-2.5rem)] overflow-y-auto px-2 pt-8 pb-36 sm:px-6 lg:px-10">
              <EditorContent editor={configuredEditor} />
            </div>
            <AiBubbleMenuView
              editor={configuredEditor}
              session={session}
              showReview={false}
            />
            <div className="absolute inset-x-0 bottom-4 z-10 mx-auto w-[calc(100%-2rem)] md:w-[52%]">
              <AiComposerView
                editor={configuredEditor}
                session={session}
                showReview={!sideChatOpen}
              />
            </div>
          </div>
          <AiSideChatView
            editor={configuredEditor}
            session={session}
            inline
            open={sideChatOpen}
            onOpenChange={setSideChatOpen}
            panelClassName="absolute inset-0 z-20 border-l border-border md:static md:z-auto"
          />
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
