"use client"

import type { ChangeEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { Editor, type JSONContent } from "@tiptap/core"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { Markdown } from "@tiptap/markdown"
import type { Transaction } from "@tiptap/pm/state"
import StarterKit from "@tiptap/starter-kit"
import {
  EmendAiController,
  type EmendActionId,
  type EmendAiControllerSnapshot,
  type EmendContextScope,
  type EmendInteractionMode,
  type EmendMutationOperation,
  type EmendTargetScope,
} from "@emend/ai"
import { createMockTransport } from "@emend/ai/transport"
import {
  captureTiptapContent,
  createEmendTiptapAdapter,
  EMEND_AI_TRANSACTION_META,
  EmendAi,
  getTiptapSourceRevision,
  type EmendAiTransactionMeta,
  type EmendTiptapAdapter,
  type EmendTiptapCapture,
  type EmendTiptapPreparation,
} from "@emend/ai/tiptap"
import { Button } from "@workspace/ui/components/button"

type MockMode = "normal" | "delayed" | "failing"
type TargetPresetId =
  | "selection"
  | "cursor"
  | "current-block"
  | "whole-block"
  | "document"

interface EditorPreset {
  readonly id: string
  readonly label: string
  readonly content: JSONContent
}

interface ProposalPreset {
  readonly id: string
  readonly label: string
  readonly markdown: string
}

interface HarnessError {
  readonly code: string
  readonly message: string
}

interface HarnessRuntime {
  readonly editor: Editor
  readonly adapter: EmendTiptapAdapter
  readonly controller: EmendAiController
  readonly setMockMode: (mode: MockMode) => void
}

interface RuntimeCallbacks {
  readonly onCapture: (capture: EmendTiptapCapture) => void
  readonly onTransaction: (transaction: Transaction) => void
}

const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  ...(content.length > 0 ? { content } : {}),
})

const text = (value: string, marks?: JSONContent["marks"]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
})

const mark = (type: string, attrs?: Record<string, unknown>) => ({
  type,
  ...(attrs ? { attrs } : {}),
})

const listItem = (...content: JSONContent[]): JSONContent => ({
  type: "listItem",
  content,
})

const taskItem = (value: string, checked = false): JSONContent => ({
  type: "taskItem",
  attrs: { checked },
  content: [paragraph(text(value))],
})

const tableCell = (
  type: "tableCell" | "tableHeader",
  value: string,
  align: "left" | "center" | "right" = "left"
): JSONContent => ({
  type,
  attrs: { colspan: 1, rowspan: 1, colwidth: null, align },
  content: [paragraph(text(value))],
})

const richDocument: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [text("Emend Tiptap harness")],
    },
    paragraph(
      text("Select this "),
      text("marked paragraph", [mark("bold")]),
      text(" to exercise exact ranges, source marks, and safe preview.")
    ),
    paragraph(
      text("A linked phrase", [
        mark("link", { href: "https://example.com/docs" }),
      ]),
      text(" and a little "),
      text("italic context", [mark("italic")]),
      text(" are available for Ask and Edit requests.")
    ),
    {
      type: "bulletList",
      content: [
        listItem(paragraph(text("First bullet"))),
        listItem(paragraph(text("Nested bullet")), {
          type: "bulletList",
          content: [listItem(paragraph(text("Nested child")))],
        }),
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 1, type: null },
      content: [listItem(paragraph(text("Ordered item one")))],
    },
    {
      type: "taskList",
      content: [taskItem("Review the proposal", false)],
    },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [text("const accepted = true")],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            tableCell("tableHeader", "Feature"),
            tableCell("tableHeader", "Value", "center"),
          ],
        },
        {
          type: "tableRow",
          content: [
            tableCell("tableCell", "Formatting"),
            tableCell("tableCell", "Supported", "center"),
          ],
        },
      ],
    },
    paragraph(text("The last paragraph is useful for Document replacement.")),
  ],
}

const simpleDocument: JSONContent = {
  type: "doc",
  content: [
    paragraph(
      text("A small document makes exact replacement and Undo easy to inspect.")
    ),
    paragraph(text("The second paragraph stays outside a Selection target.")),
  ],
}

const headingDocument: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [text("A heading")] },
    paragraph(text("The current block control resolves the heading itself.")),
  ],
}

const tableDocument: JSONContent = {
  type: "doc",
  content: [
    paragraph(text("Place the cursor in the table-ready document.")),
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            tableCell("tableHeader", "Feature"),
            tableCell("tableHeader", "Value", "center"),
          ],
        },
        {
          type: "tableRow",
          content: [
            tableCell("tableCell", "Tables"),
            tableCell("tableCell", "Need a block target", "center"),
          ],
        },
      ],
    },
  ],
}

const editorPresets: readonly EditorPreset[] = [
  { id: "rich", label: "Rich document", content: richDocument },
  { id: "simple", label: "Two paragraphs", content: simpleDocument },
  { id: "heading", label: "Heading attributes", content: headingDocument },
  { id: "table", label: "Table-ready document", content: tableDocument },
]

const basicTableMarkdown = `| Feature | Value |
| :--- | :---: |
| Formatting | **bold** |
| Link | [docs](https://example.com/docs) |`

const proposalPresets: readonly ProposalPreset[] = [
  {
    id: "streamed",
    label: "Use streamed proposal",
    markdown: "",
  },
  {
    id: "inline-rewrite",
    label: "One-paragraph inline rewrite",
    markdown: "A clearer **inline** rewrite with a direct point.",
  },
  {
    id: "multi-paragraph",
    label: "Multiple paragraphs at inline target",
    markdown: "First replacement paragraph.\n\nSecond replacement paragraph.",
  },
  {
    id: "marked-link",
    label: "Bold and linked inline output",
    markdown: "**Bold output** with a [safe link](https://example.com).",
  },
  {
    id: "neutral-block",
    label: "Neutral current-block rewrite",
    markdown: "A neutral rewrite keeps the captured heading type.",
  },
  {
    id: "structured-block",
    label: "Explicit heading and list",
    markdown: "## Replacement heading\n\n- One item\n- Two items",
  },
  {
    id: "insert-inline",
    label: "Insert inline content",
    markdown: "Inserted at the cursor.",
  },
  {
    id: "insert-block",
    label: "Insert multiple blocks",
    markdown: "First inserted block.\n\nSecond inserted block.",
  },
  {
    id: "basic-table",
    label: "Valid basic GFM table",
    markdown: basicTableMarkdown,
  },
  {
    id: "raw-html",
    label: "Raw HTML",
    markdown: "<div>Raw HTML is blocked.</div>",
  },
  {
    id: "generated-image",
    label: "Generated image",
    markdown: "![generated diagram](https://example.com/generated.png)",
  },
  {
    id: "unsafe-link",
    label: "Unsafe link",
    markdown: "[unsafe](javascript:alert(1))",
  },
  {
    id: "malformed-fence",
    label: "Malformed fence",
    markdown: "```ts\nconst incomplete = true",
  },
  {
    id: "unsupported-table",
    label: "Unsupported table shape",
    markdown: "| A | B |\n| --- | --- |\n| Only A |",
  },
  {
    id: "plain-text-fallback",
    label: "Structured content for plain-text fallback",
    markdown: "# Plain text title\n\n- Fallback item one\n- Fallback item two",
  },
  {
    id: "document-replacement",
    label: "Complete Document replacement",
    markdown: "# Replaced document\n\nThe whole document is replaced once.",
  },
]

export function Phase4TiptapHarness() {
  const mountRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<HarnessRuntime | null>(null)
  const pendingProposalIdRef = useRef<string | null>(null)
  const [runtime, setRuntime] = useState<HarnessRuntime | null>(null)
  const [snapshot, setSnapshot] = useState<EmendAiControllerSnapshot | null>(
    null
  )
  const [capture, setCapture] = useState<EmendTiptapCapture | null>(null)
  const [editorVersion, setEditorVersion] = useState(0)
  const [editorPresetId, setEditorPresetId] = useState("rich")
  const [targetPresetId, setTargetPresetId] =
    useState<TargetPresetId>("selection")
  const [actionId, setActionId] = useState<EmendActionId>("improve")
  const [interactionMode, setInteractionMode] =
    useState<EmendInteractionMode>("edit")
  const [targetScope, setTargetScope] = useState<EmendTargetScope>("selection")
  const [contextScope, setContextScope] =
    useState<EmendContextScope>("document")
  const [instruction, setInstruction] = useState("")
  const [mockMode, setMockMode] = useState<MockMode>("normal")
  const [inlinePreview, setInlinePreview] = useState(true)
  const [confirmDocumentReplacement, setConfirmDocumentReplacement] =
    useState(false)
  const [proposalPresetId, setProposalPresetId] = useState("streamed")
  const [reviewedMarkdown, setReviewedMarkdown] = useState("")
  const [preparation, setPreparation] = useState<EmendTiptapPreparation | null>(
    null
  )
  const [lastAction, setLastAction] = useState("No harness action yet")
  const [lastActionError, setLastActionError] = useState<HarnessError | null>(
    null
  )
  const [jsonEvidence, setJsonEvidence] = useState<Record<string, string>>({})
  const [lastAcceptedMetadata, setLastAcceptedMetadata] =
    useState<EmendAiTransactionMeta | null>(null)
  const [acceptDispatchCount, setAcceptDispatchCount] = useState(0)

  const pendingProposal = snapshot?.pendingProposal ?? null

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const nextRuntime = createHarnessRuntime(mount, {
      onCapture(nextCapture) {
        setCapture(nextCapture)
      },
      onTransaction(transaction) {
        setEditorVersion((value) => value + 1)

        const metadata = transaction.getMeta(EMEND_AI_TRANSACTION_META)
        if (transaction.docChanged && isEmendAiTransactionMeta(metadata)) {
          setLastAcceptedMetadata(metadata)
          setAcceptDispatchCount((value) => value + 1)
        }
      },
    })

    runtimeRef.current = nextRuntime
    setRuntime(nextRuntime)
    setSnapshot(nextRuntime.controller.getSnapshot())
    const unsubscribe = nextRuntime.controller.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot)

      const nextProposal = nextSnapshot.pendingProposal
      if (!nextProposal) {
        pendingProposalIdRef.current = null
        return
      }
      if (pendingProposalIdRef.current === nextProposal.id) return

      pendingProposalIdRef.current = nextProposal.id
      setReviewedMarkdown(nextProposal.content.value)
      setProposalPresetId("streamed")
      setPreparation(null)
      setLastActionError(null)
    })

    return () => {
      unsubscribe()
      nextRuntime.adapter.destroy()
      nextRuntime.editor.destroy()
      runtimeRef.current = null
      setRuntime(null)
    }
  }, [])

  const editorMount = (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="font-heading text-lg font-semibold">Mounted editor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A plain vanilla Tiptap Editor is mounted into this React-owned
          element. The editor owns the schema and Markdown extension list.
        </p>
      </div>
      <div className="mt-5 flex min-h-64 items-start rounded-xl border border-input bg-background p-4">
        <div ref={mountRef} className="phase-4-editor w-full" />
      </div>
    </section>
  )

  if (!runtime || !snapshot) {
    return (
      <div className="space-y-6">
        {editorMount}
        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          Mounting the vanilla Tiptap editor…
        </section>
      </div>
    )
  }

  const activeRuntime = runtime
  const editor = activeRuntime.editor
  const currentRevision = getTiptapSourceRevision(editor)
  const editorState = activeRuntime.adapter.getEditorState()
  const currentJson = jsonText(editor.getJSON())
  const reviewedProposal = pendingProposal
    ? {
        ...pendingProposal,
        content: { format: "markdown" as const, value: reviewedMarkdown },
        userModified: reviewedMarkdown !== pendingProposal.content.value,
      }
    : null
  const mutationOperation = resolveMutationOperation(
    editor,
    actionId,
    interactionMode,
    targetScope
  )
  const running =
    snapshot.state === "submitting" || snapshot.state === "streaming"
  const preparationCanShow = preparation && preparation.kind !== "blocked"
  const documentReplacement =
    (preparation?.kind !== "blocked" &&
      preparation?.requiresDocumentConfirmation === true) ||
    (mutationOperation === "replace-document" && !editor.isEmpty)

  function handleActionChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextAction = event.target.value as EmendActionId
    setActionId(nextAction)
    if (nextAction === "summarize") setInteractionMode("ask")
    if (nextAction !== "custom" && nextAction !== "summarize") {
      setInteractionMode("edit")
    }
  }

  function handleInteractionChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value as EmendInteractionMode
    if (actionId === "summarize") return
    setInteractionMode(nextMode)
  }

  function handleTargetPreset(nextPreset: TargetPresetId) {
    setTargetPresetId(nextPreset)
    setLastActionError(null)

    if (nextPreset === "selection") {
      const range = findFirstTextRange(editor)
      if (range) editor.commands.setTextSelection(range)
      setTargetScope("selection")
      return
    }

    if (nextPreset === "cursor") {
      const range = findFirstTextRange(editor)
      if (range) editor.commands.setTextSelection(range.from)
      setTargetScope("selection")
      return
    }

    if (nextPreset === "current-block") {
      const range = findCurrentBlockRange(editor)
      if (range) editor.commands.setTextSelection(range.from + 1)
      setTargetScope("current-block")
      return
    }

    if (nextPreset === "whole-block") {
      const range = findCurrentBlockRange(editor)
      if (range && range.to - range.from > 1) {
        editor.commands.setTextSelection({
          from: range.from + 1,
          to: range.to - 1,
        })
      }
      setTargetScope("selection")
      return
    }

    const range = findFirstTextRange(editor)
    if (range) editor.commands.setTextSelection(range.from)
    setTargetScope("document")
  }

  function handleLoadEditorPreset(event: ChangeEvent<HTMLSelectElement>) {
    const preset = editorPresets.find(({ id }) => id === event.target.value)
    if (!preset) return

    activeRuntime.adapter.reject()
    activeRuntime.controller.reject()
    editor.commands.setContent(preset.content)
    setEditorPresetId(preset.id)
    setTargetPresetId("selection")
    setCapture(null)
    setReviewedMarkdown("")
    setPreparation(null)
    setLastAction(`Loaded ${preset.label}`)
    setLastActionError(null)
  }

  function handleMockModeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value as MockMode
    activeRuntime.setMockMode(nextMode)
    setMockMode(nextMode)
  }

  function handleRun() {
    setLastActionError(null)
    setPreparation(null)
    setLastAction(`Running ${actionId} as ${interactionMode}`)

    void activeRuntime.controller.run(actionId, {
      interactionMode,
      targetScope,
      contextScope,
      mutationOperation,
      ...(instruction.trim() ? { instruction: instruction.trim() } : {}),
    })
  }

  function handlePrepare() {
    if (!reviewedProposal) return

    const nextPreparation = activeRuntime.adapter.prepare(
      reviewedProposal,
      reviewedProposal.userModified ? reviewedProposal.content.value : undefined
    )
    setPreparation(nextPreparation)
    setLastAction(`Prepared ${nextPreparation.kind}`)
    setLastActionError(
      nextPreparation.kind === "blocked"
        ? toHarnessError(nextPreparation.error)
        : null
    )
  }

  function handleShow() {
    if (!reviewedProposal || !preparationCanShow || !preparation) return

    recordJson("before preview")
    const result = activeRuntime.adapter.show(reviewedProposal, preparation, {
      inlinePreview,
    })
    if (!result.ok) {
      setLastAction(`Preview failed: ${result.error.code}`)
      setLastActionError(toHarnessError(result.error))
      return
    }

    recordJson("after preview")
    setLastAction(
      inlinePreview ? "Target and inline preview shown" : "Target shown"
    )
    setLastActionError(null)
  }

  function handleAccept(kind: "structured" | "plain-text") {
    if (!reviewedProposal || !preparation || preparation.kind === "blocked") {
      return
    }
    if (kind === "structured" && preparation.kind !== "supported-markdown") {
      setLastActionError(
        displayError(
          "invalid_request",
          "Use Apply as plain text for a Plain-text fallback."
        )
      )
      return
    }
    if (kind === "plain-text" && preparation.kind !== "plain-text-fallback") {
      setLastActionError(
        displayError(
          "invalid_request",
          "This preparation is not a Plain-text fallback."
        )
      )
      return
    }

    const result = activeRuntime.adapter.accept(reviewedProposal, preparation, {
      confirmDocumentReplacement,
    })
    if (!result.ok) {
      setLastAction(`Accept failed: ${result.error.code}`)
      setLastActionError(toHarnessError(result.error))
      return
    }

    const cleared = activeRuntime.controller.clearPendingProposal(
      reviewedProposal.id
    )
    if (!cleared) {
      setLastActionError(
        displayError(
          "invalid_request",
          "The editor accepted the proposal, but the controller acknowledgment did not match."
        )
      )
      return
    }

    recordJson(
      kind === "plain-text" ? "after Apply as plain text" : "after Accept"
    )
    setPreparation(null)
    setLastAction(
      kind === "plain-text" ? "Applied plain text" : "Accepted proposal"
    )
    setLastActionError(null)
  }

  function handleReject() {
    if (!reviewedProposal) return

    const result = activeRuntime.adapter.reject(reviewedProposal.id)
    if (!result.ok) {
      setLastAction(`Reject failed: ${result.error.code}`)
      setLastActionError(toHarnessError(result.error))
      return
    }

    activeRuntime.controller.clearPendingProposal(reviewedProposal.id)
    recordJson("after Reject")
    setPreparation(null)
    setLastAction("Rejected proposal")
    setLastActionError(null)
  }

  function handleRegenerate() {
    setPreparation(null)
    setLastActionError(null)
    setLastAction("Regenerating from a fresh capture")
    void activeRuntime.controller.regenerate()
  }

  function handleOrdinaryEdit() {
    editor.commands.insertContent(" ordinary edit")
    setLastAction("Performed an ordinary content edit")
  }

  function handleUndo() {
    if (editor.commands.undo()) {
      recordJson("after Undo")
      setLastAction("Undo")
    }
  }

  function handleRedo() {
    if (editor.commands.redo()) {
      recordJson("after Redo")
      setLastAction("Redo")
    }
  }

  function recordJson(label: string) {
    setJsonEvidence((previous) => ({
      ...previous,
      [label]: jsonText(editor.getJSON()),
    }))
  }

  return (
    <div className="space-y-6" data-editor-version={editorVersion}>
      {editorMount}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Manual verification flow
            </h2>
            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
              Use the controls from left to right: choose editor content and a
              target, run or select a proposal, prepare it, show the decoration,
              then Accept, Reject, Undo, or Redo it.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-medium">
            {snapshot.state}
          </span>
        </div>
        {snapshot.error && <ErrorMessage error={snapshot.error} />}
        {lastActionError && <ErrorMessage error={lastActionError} />}
        <p className="mt-4 text-xs text-muted-foreground">
          Last action: <span className="font-medium">{lastAction}</span>
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Editor controls
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Load a content preset, create an exact target, or make an ordinary
              edit while a proposal is open.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Editor content preset
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={editorPresetId}
                onChange={handleLoadEditorPreset}
              >
                {editorPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Target control
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={targetPresetId}
                onChange={(event) =>
                  handleTargetPreset(event.target.value as TargetPresetId)
                }
              >
                <option value="selection">Exact text Selection</option>
                <option value="cursor">Collapsed cursor</option>
                <option value="current-block">Current block</option>
                <option value="whole-block">Whole-block Selection</option>
                <option value="document">Document target</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleUndo}>
              Undo
            </Button>
            <Button variant="outline" onClick={handleRedo}>
              Redo
            </Button>
            <Button variant="outline" onClick={handleOrdinaryEdit}>
              Ordinary content edit
            </Button>
          </div>

          <EvidenceTable
            title="Current editor state"
            rows={[
              ["Document JSON bytes", String(currentJson.length)],
              [
                "Current revision",
                currentRevision.ok
                  ? `${currentRevision.revision.counter} / ${currentRevision.revision.fingerprint}`
                  : currentRevision.error.code,
              ],
              ["Accept document dispatches", String(acceptDispatchCount)],
            ]}
          />
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">Request</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask is informational. Edit captures one exact mutation target and
              uses the deterministic mock transport.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Action
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={actionId}
                onChange={handleActionChange}
              >
                <option value="improve">Improve</option>
                <option value="shorten">Shorten</option>
                <option value="expand">Expand</option>
                <option value="fix-grammar">Fix grammar</option>
                <option value="continue">Continue</option>
                <option value="summarize">Summarize</option>
                <option value="custom">Custom instruction</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Interaction
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={interactionMode}
                disabled={actionId === "summarize"}
                onChange={handleInteractionChange}
              >
                <option value="edit">Edit</option>
                <option value="ask">Ask</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Target scope
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={targetScope}
                onChange={(event) =>
                  setTargetScope(event.target.value as EmendTargetScope)
                }
              >
                <option value="selection">Selection</option>
                <option value="current-block">Current block</option>
                <option value="document">Document</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Context scope
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={contextScope}
                onChange={(event) =>
                  setContextScope(event.target.value as EmendContextScope)
                }
              >
                <option value="selection">Selection</option>
                <option value="current-block">Current block</option>
                <option value="document">Document</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Custom instruction
            <input
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={instruction}
              placeholder="Required for Custom"
              onChange={(event) => setInstruction(event.target.value)}
            />
          </label>

          <EvidenceTable
            title="Captured request choices"
            rows={[
              ["Target scope", targetScope],
              ["Context scope", contextScope],
              ["Mutation operation", mutationOperation ?? "none"],
              ["Mock transport", mockMode],
            ]}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRun} disabled={running}>
              Run {interactionMode === "ask" ? "Ask" : "Edit"}
            </Button>
            {running && (
              <Button
                variant="outline"
                onClick={() => activeRuntime.controller.cancel()}
              >
                Stop
              </Button>
            )}
            {(snapshot.state === "error" || snapshot.state === "aborted") && (
              <Button
                variant="outline"
                onClick={() => void activeRuntime.controller.retry()}
              >
                Retry
              </Button>
            )}
            {snapshot.activeRequest && (
              <Button variant="outline" onClick={handleRegenerate}>
                Regenerate
              </Button>
            )}
            {pendingProposal && (
              <Button variant="destructive" onClick={handleReject}>
                Reject
              </Button>
            )}
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Transport mode
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={mockMode}
              onChange={handleMockModeChange}
            >
              <option value="normal">Normal</option>
              <option value="delayed">Delayed stream</option>
              <option value="failing">Fail after three deltas</option>
            </select>
          </label>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">Capture</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Target and context are captured independently. Local slices and
              marks stay in the adapter and never enter the request payload.
            </p>
          </div>
          {capture ? (
            <>
              <EvidenceTable
                title="Captured ranges and revision"
                rows={[
                  [
                    "Target range",
                    capture.target
                      ? formatRange(capture.target.range)
                      : "none (Ask)",
                  ],
                  ["Context range", formatRange(capture.context.range)],
                  [
                    "Captured revision",
                    `${capture.protocol.sourceRevision.counter} / ${capture.protocol.sourceRevision.fingerprint}`,
                  ],
                  ["Target parent", capture.target?.parentNodeType ?? "none"],
                  ["Target placement", capture.target?.placement ?? "none"],
                  ["Target text-safe", capture.target?.textSafe ? "yes" : "no"],
                ]}
              />
              <OutputCard
                title="Target Source Markdown"
                value={capture.protocol.targetMarkdown || "(empty)"}
              />
              <OutputCard
                title="Context Source Markdown"
                value={capture.protocol.contextMarkdown || "(empty)"}
              />
              <OutputCard
                title="Schema capabilities"
                value={jsonText(capture.protocol.schemaCapabilities)}
              />
              {capture.warnings.length > 0 && (
                <OutputCard
                  title="Capture warnings"
                  value={jsonText(capture.warnings)}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run an Edit or Ask to capture the current editor selection.
            </p>
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">Controller</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Streaming Markdown remains separate from the canonical document
              until an explicit review action succeeds.
            </p>
          </div>
          <EvidenceTable
            title="Controller state"
            rows={[
              ["State", snapshot.state],
              ["Request ID", snapshot.activeRequest?.requestId ?? "none"],
              ["Stream completed", snapshot.streamCompleted ? "yes" : "no"],
              ["Pending proposal", snapshot.pendingProposal?.id ?? "none"],
            ]}
          />
          {snapshot.streamedMarkdown && (
            <OutputCard
              title="Streamed raw Markdown"
              value={snapshot.streamedMarkdown}
            />
          )}
          {snapshot.informationalMarkdown && (
            <OutputCard
              title="Informational Ask output"
              value={snapshot.informationalMarkdown}
            />
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">Proposal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Presets only replace the reviewed Markdown. They still use the
              same target-aware preparation, preview, and exact apply path.
            </p>
          </div>

          <EvidenceTable
            title="Proposal identity"
            rows={[
              ["Proposal ID", pendingProposal?.id ?? "none"],
              ["Action ID", pendingProposal?.actionId ?? "none"],
              ["User modified", reviewedProposal?.userModified ? "yes" : "no"],
            ]}
          />

          <label className="grid gap-2 text-sm font-medium">
            Proposal preset
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={proposalPresetId}
              onChange={(event) => {
                const nextPreset = proposalPresets.find(
                  ({ id }) => id === event.target.value
                )
                if (!nextPreset) return
                setProposalPresetId(nextPreset.id)
                setReviewedMarkdown(
                  nextPreset.id === "streamed"
                    ? (pendingProposal?.content.value ?? "")
                    : nextPreset.markdown
                )
                setPreparation(null)
                setLastActionError(null)
              }}
            >
              {proposalPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Editable Proposal Markdown
            <textarea
              className="min-h-48 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={reviewedMarkdown}
              disabled={!pendingProposal}
              onChange={(event) => {
                setReviewedMarkdown(event.target.value)
                setProposalPresetId("streamed")
                setPreparation(null)
                setLastActionError(null)
              }}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrepare} disabled={!reviewedProposal}>
              Prepare proposal
            </Button>
            <Button
              variant="outline"
              onClick={handleShow}
              disabled={!preparationCanShow}
            >
              {inlinePreview ? "Show preview" : "Show target"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAccept("structured")}
              disabled={preparation?.kind !== "supported-markdown"}
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAccept("plain-text")}
              disabled={preparation?.kind !== "plain-text-fallback"}
            >
              Apply as plain text
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!reviewedProposal}
            >
              Reject
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inlinePreview}
              onChange={(event) => setInlinePreview(event.target.checked)}
            />
            Show the schema-derived inline/block preview decoration
          </label>

          {documentReplacement && (
            <label className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={confirmDocumentReplacement}
                onChange={(event) =>
                  setConfirmDocumentReplacement(event.target.checked)
                }
              />
              <span>
                Confirm replacing the non-empty Document. This flag is checked
                again at the apply boundary.
              </span>
            </label>
          )}

          {preparation && <PreparationView preparation={preparation} />}
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">Evidence</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The public plugin snapshot excludes DecorationSet internals. The
              JSON snapshots make it visible that preview and Reject are not
              document changes, while Accept is one isolated history event.
            </p>
          </div>

          <EvidenceTable
            title="Plugin and revision snapshot"
            rows={[
              [
                "Revision counter",
                String(editorState?.revisionCounter ?? "none"),
              ],
              ["Active proposal", editorState?.activeProposalId ?? "none"],
              ["Pinned target", formatRange(editorState?.targetRange)],
              ["Plugin source revision", jsonText(editorState?.sourceRevision)],
              ["Stale", editorState?.stale ? "yes" : "no"],
              ["Preview kind", editorState?.previewKind ?? "none"],
              ["Accept dispatch count", String(acceptDispatchCount)],
            ]}
          />

          <OutputCard title="Current editor JSON" value={currentJson} />
          <OutputCard
            title="Last accepted Emend transaction metadata"
            value={jsonText(lastAcceptedMetadata)}
          />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recorded JSON checkpoints</h3>
            {Object.entries(jsonEvidence).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Use Show preview, Reject, Accept, Undo, or Redo to record a
                checkpoint.
              </p>
            ) : (
              Object.entries(jsonEvidence).map(([label, value]) => (
                <OutputCard key={label} title={label} value={value} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function createHarnessRuntime(
  element: HTMLElement,
  callbacks: RuntimeCallbacks
): HarnessRuntime {
  const mode = { value: "normal" as MockMode }
  const editor = new Editor({
    element,
    content: richDocument,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit,
      Markdown.configure({ markedOptions: { gfm: true } }),
      EmendAi,
    ],
    onTransaction: ({ transaction }) => callbacks.onTransaction(transaction),
  })
  const initialSelection = findFirstTextRange(editor)
  if (initialSelection) editor.commands.setTextSelection(initialSelection)
  const adapter = createEmendTiptapAdapter(editor)
  const controller = new EmendAiController({
    transport: {
      run(request, signal) {
        return createMockTransport(mockTransportOptions(mode.value)).run(
          request,
          signal
        )
      },
    },
    capture(options) {
      const detail = captureTiptapContent(editor, options)
      if (detail.ok) callbacks.onCapture(detail.capture)
      return adapter.capture(options)
    },
    isSourceRevisionCurrent: (revision) =>
      adapter.isSourceRevisionCurrent(revision),
  })

  return {
    editor,
    adapter,
    controller,
    setMockMode(nextMode) {
      mode.value = nextMode
    },
  }
}

function mockTransportOptions(mode: MockMode) {
  if (mode === "delayed") return { delayMs: 300 }
  if (mode === "failing") return { failAfterDeltas: 3 }
  return {}
}

function resolveMutationOperation(
  editor: Editor,
  actionId: EmendActionId,
  interactionMode: EmendInteractionMode,
  targetScope: EmendTargetScope
): EmendMutationOperation | null {
  if (interactionMode === "ask") return null
  if (actionId === "continue") return "insert-at-cursor"
  if (targetScope === "current-block") return "replace-current-block"
  if (targetScope === "document") return "replace-document"
  return editor.state.selection.empty ? "insert-at-cursor" : "replace-selection"
}

function findFirstTextRange(
  editor: Editor
): { readonly from: number; readonly to: number } | null {
  let result: { readonly from: number; readonly to: number } | null = null
  let fallback: { readonly from: number; readonly to: number } | null = null
  editor.state.doc.descendants((node, position) => {
    if (!result && node.type.name === "paragraph" && node.content.size > 0) {
      result = { from: position + 1, to: position + node.nodeSize - 1 }
      return false
    }
    if (!fallback && node.isText && node.text) {
      fallback = { from: position, to: position + node.nodeSize }
    }
    return true
  })
  return result ?? fallback
}

function findCurrentBlockRange(
  editor: Editor
): { readonly from: number; readonly to: number } | null {
  const resolved = editor.state.selection.$from
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    if (resolved.node(depth).isTextblock) {
      return { from: resolved.before(depth), to: resolved.after(depth) }
    }
  }
  return null
}

function isEmendAiTransactionMeta(
  value: unknown
): value is EmendAiTransactionMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "origin" in value &&
    value.origin === "emend-ai" &&
    "proposalId" in value &&
    typeof value.proposalId === "string" &&
    "actionId" in value &&
    typeof value.actionId === "string" &&
    "userModified" in value &&
    typeof value.userModified === "boolean"
  )
}

function formatRange(
  range: { readonly from: number; readonly to: number } | null | undefined
): string {
  return range ? `${range.from}–${range.to}` : "none"
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? ""
}

function displayError(code: string, message: string): HarnessError {
  return { code, message }
}

function toHarnessError(error: {
  readonly code: string
  readonly message: string
}) {
  return displayError(error.code, error.message)
}

function ErrorMessage({ error }: { readonly error: HarnessError }) {
  return (
    <div
      className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      aria-live="polite"
    >
      <p className="font-mono text-xs font-semibold">{error.code}</p>
      <p className="mt-1">{error.message}</p>
    </div>
  )
}

function EvidenceTable({
  title,
  rows,
}: {
  readonly title: string
  readonly rows: readonly (readonly [string, string])[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-xs break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function OutputCard({
  title,
  value,
}: {
  readonly title: string
  readonly value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  )
}

function PreparationView({
  preparation,
}: {
  readonly preparation: EmendTiptapPreparation
}) {
  return (
    <div className="space-y-4">
      <EvidenceTable
        title="Preparation"
        rows={[
          ["Kind", preparation.kind],
          ["Proposal ID", preparation.proposalId],
          [
            "Target range",
            preparation.kind === "blocked"
              ? "not available"
              : formatRange(preparation.targetRange),
          ],
          ["User modified", preparation.userModified ? "yes" : "no"],
          [
            "Document confirmation",
            preparation.kind === "blocked"
              ? "not available"
              : preparation.requiresDocumentConfirmation
                ? "required"
                : "not required",
          ],
        ]}
      />
      {preparation.kind === "blocked" ? (
        <>
          <OutputCard
            title="Blocked error"
            value={jsonText(preparation.error)}
          />
          <OutputCard
            title="Reviewed Markdown"
            value={preparation.rawMarkdown || "(empty)"}
          />
        </>
      ) : (
        <>
          <OutputCard
            title="Normalized Markdown"
            value={preparation.normalizedMarkdown}
          />
          {preparation.kind === "plain-text-fallback" && (
            <OutputCard
              title="Exact plain-text fallback"
              value={preparation.text}
            />
          )}
        </>
      )}
      {preparation.warnings.length > 0 && (
        <OutputCard
          title="Preparation warnings"
          value={jsonText(preparation.warnings)}
        />
      )}
    </div>
  )
}
