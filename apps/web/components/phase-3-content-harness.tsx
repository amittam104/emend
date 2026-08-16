"use client"

import type { ChangeEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { Editor, type JSONContent } from "@tiptap/core"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { Markdown } from "@tiptap/markdown"
import StarterKit from "@tiptap/starter-kit"
import {
  prepareProposalMarkdown,
  serializeSourceMarkdown,
  type EmendMarkdownWarning,
  type EmendPreparedProposal,
  type EmendSourceMarkdownResult,
} from "@emend/ai/content"
import { Button } from "@workspace/ui/components/button"

type TableCellType = "tableCell" | "tableHeader"
type TableAlign = "left" | "center" | "right"

interface SourcePreset {
  readonly id: string
  readonly label: string
  readonly target: JSONContent | null
  readonly context: JSONContent
  readonly contextProjection?: string
}

interface ProposalPreset {
  readonly id: string
  readonly label: string
  readonly markdown: string
  readonly textSafeTarget: boolean
}

interface EditorCheck {
  readonly action: string
  readonly before: string
  readonly after: string
  readonly unchanged: boolean
}

interface SourceRoundTrip {
  readonly parsed: string
  readonly reserialized: string
  readonly reparsed: string
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

const documentNode = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
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
  type: TableCellType,
  content: JSONContent[],
  align?: TableAlign
): JSONContent => ({
  type,
  attrs: {
    colspan: 1,
    rowspan: 1,
    colwidth: null,
    align: align ?? null,
  },
  content: [paragraph(...content)],
})

const tableRow = (...content: JSONContent[]): JSONContent => ({
  type: "tableRow",
  content,
})

const table = (...rows: JSONContent[]): JSONContent => ({
  type: "table",
  content: rows,
})

const supportedDocument = documentNode(
  {
    type: "heading",
    attrs: { level: 1 },
    content: [text("Supported Markdown")],
  },
  paragraph(
    text("Bold", [mark("bold")]),
    text(" and "),
    text("italic", [mark("italic")]),
    text(" and "),
    text("combined", [mark("bold"), mark("italic")]),
    text(" with "),
    text("strike", [mark("strike")]),
    text(", "),
    text("underline", [mark("underline")]),
    text(", "),
    text("inline code", [mark("code")]),
    text(", and a "),
    text("safe link", [mark("link", { href: "https://example.com" })]),
    text("."),
    { type: "hardBreak" },
    text("This line follows a hard break.")
  ),
  {
    type: "bulletList",
    content: [
      listItem(paragraph(text("Bullet item")), {
        type: "bulletList",
        content: [listItem(paragraph(text("Nested bullet item")))],
      }),
    ],
  },
  {
    type: "orderedList",
    attrs: { start: 1, type: null },
    content: [listItem(paragraph(text("Decimal ordered item")))],
  },
  paragraph(text("Alphabetic marker:")),
  {
    type: "orderedList",
    attrs: { start: 1, type: "a" },
    content: [listItem(paragraph(text("Alphabetic ordered item")))],
  },
  paragraph(text("Roman marker:")),
  {
    type: "orderedList",
    attrs: { start: 1, type: "i" },
    content: [listItem(paragraph(text("Roman ordered item")))],
  },
  {
    type: "taskList",
    content: [
      {
        ...taskItem("Completed task", true),
        content: [
          paragraph(text("Completed task")),
          {
            type: "taskList",
            content: [taskItem("Nested task")],
          },
        ],
      },
    ],
  },
  {
    type: "blockquote",
    content: [
      paragraph(text("A blockquote")),
      {
        type: "blockquote",
        content: [paragraph(text("A nested blockquote"))],
      },
    ],
  },
  {
    type: "codeBlock",
    attrs: { language: "ts" },
    content: [text("const supported = true")],
  },
  {
    type: "horizontalRule",
  },
  table(
    tableRow(
      tableCell("tableHeader", [text("Feature")], "left"),
      tableCell("tableHeader", [text("Value")], "center"),
      tableCell("tableHeader", [text("Link")], "right")
    ),
    tableRow(
      tableCell("tableCell", [text("Formatting")], "left"),
      tableCell(
        "tableCell",
        [
          text("a | b", [mark("code")]),
          { type: "hardBreak" },
          text("after break"),
        ],
        "center"
      ),
      tableCell(
        "tableCell",
        [text("docs", [mark("link", { href: "https://example.com/docs" })])],
        "right"
      )
    )
  )
)

const simpleContext = documentNode(
  paragraph(text("Read-only context for the source serializer."))
)

const unsupportedImageDocument = documentNode({
  type: "image",
  attrs: { src: "https://example.com/generated.png", alt: "diagram" },
})

const safeLinksDocument = documentNode(
  paragraph(
    text("Relative", [mark("link", { href: "/guide" })]),
    text(" "),
    text("fragment", [mark("link", { href: "#section" })]),
    text(" "),
    text("HTTPS", [mark("link", { href: "https://example.com" })]),
    text(" "),
    text("email", [mark("link", { href: "mailto:team@example.com" })])
  )
)

const unsafeLinksDocument = documentNode(
  paragraph(
    text("JavaScript", [mark("link", { href: "javascript:alert(1)" })]),
    text(" "),
    text("data", [mark("link", { href: "data:text/html,unsafe" })]),
    text(" "),
    text("protocol relative", [mark("link", { href: "//example.com" })]),
    text(" "),
    text("unknown", [mark("link", { href: "ftp://example.com" })])
  )
)

const missingHeaderTable = documentNode(
  table(
    tableRow(
      tableCell("tableCell", [text("No header")]),
      tableCell("tableCell", [text("No header")])
    ),
    tableRow(
      tableCell("tableCell", [text("Body")]),
      tableCell("tableCell", [text("Body")])
    )
  )
)

const mixedHeaderTable = documentNode(
  table(
    tableRow(
      tableCell("tableHeader", [text("Header")]),
      tableCell("tableCell", [text("Mixed")])
    ),
    tableRow(
      tableCell("tableCell", [text("Body")]),
      tableCell("tableCell", [text("Body")])
    )
  )
)

const unequalTable = documentNode(
  table(
    tableRow(
      tableCell("tableHeader", [text("A")]),
      tableCell("tableHeader", [text("B")])
    ),
    tableRow(tableCell("tableCell", [text("Only A")]))
  )
)

const mergedCellTable = documentNode(
  table(
    tableRow({
      ...tableCell("tableHeader", [text("Merged")]),
      attrs: { colspan: 2, rowspan: 1, colwidth: null, align: null },
    }),
    tableRow(
      tableCell("tableCell", [text("A")]),
      tableCell("tableCell", [text("B")])
    )
  )
)

const columnWidthTable = documentNode(
  table(
    tableRow(
      tableCell("tableHeader", [text("A")]),
      tableCell("tableHeader", [text("B")])
    ),
    tableRow(
      {
        ...tableCell("tableCell", [text("Width")]),
        attrs: { colspan: 1, rowspan: 1, colwidth: [120], align: null },
      },
      tableCell("tableCell", [text("B")])
    )
  )
)

const multiBlockCellTable = documentNode(
  table(
    tableRow(
      tableCell("tableHeader", [text("A")]),
      tableCell("tableHeader", [text("B")])
    ),
    tableRow(
      {
        ...tableCell("tableCell", [text("Two blocks")]),
        content: [paragraph(text("First")), paragraph(text("Second"))],
      },
      tableCell("tableCell", [text("B")])
    )
  )
)

const sourcePresets: readonly SourcePreset[] = [
  {
    id: "supported",
    label: "Supported structures",
    target: supportedDocument,
    context: simpleContext,
  },
  {
    id: "basic-table",
    label: "Basic GFM table",
    target: documentNode(supportedDocument.content?.at(-1) ?? paragraph()),
    context: simpleContext,
  },
  {
    id: "missing-header",
    label: "Table: missing header row",
    target: missingHeaderTable,
    context: simpleContext,
  },
  {
    id: "mixed-header",
    label: "Table: mixed header row",
    target: mixedHeaderTable,
    context: simpleContext,
  },
  {
    id: "unequal-columns",
    label: "Table: unequal columns",
    target: unequalTable,
    context: simpleContext,
  },
  {
    id: "merged-cell",
    label: "Table: merged cell",
    target: mergedCellTable,
    context: simpleContext,
  },
  {
    id: "column-width",
    label: "Table: column width",
    target: columnWidthTable,
    context: simpleContext,
  },
  {
    id: "multi-block-cell",
    label: "Table: multiple blocks in cell",
    target: multiBlockCellTable,
    context: simpleContext,
  },
  {
    id: "unsupported-target-node",
    label: "Target: unsupported image node",
    target: unsupportedImageDocument,
    context: simpleContext,
  },
  {
    id: "unsupported-context",
    label: "Context: unsupported node without projection",
    target: supportedDocument,
    context: unsupportedImageDocument,
  },
  {
    id: "projected-context",
    label: "Context: unsupported node with projection",
    target: supportedDocument,
    context: unsupportedImageDocument,
    contextProjection:
      "The original context is intentionally represented as plain text.\nKeep this pipe: | and this label-like line: Context projection.",
  },
  {
    id: "safe-links",
    label: "Links: safe destinations",
    target: safeLinksDocument,
    context: simpleContext,
  },
  {
    id: "unsafe-links",
    label: "Links: unsafe destinations",
    target: unsafeLinksDocument,
    context: simpleContext,
  },
]

const basicTableProposalMarkdown = `| Feature | Value | Link |
| :--- | :---: | ---: |
| Formatting | **bold** | [docs](https://example.com/docs) |
| Code | \`a \\| b\`<br>after break | [mail](mailto:team@example.com) |`

const supportedProposalMarkdown = `# Supported Markdown

This has **bold**, *italic*, ***combined emphasis***, ~~strikethrough~~, ++underline++, \`inline code\`, and a [safe link](https://example.com).

This line has a hard break.\\
The next line follows it.

- Bullet item
  - Nested bullet item

1. Decimal item

a. Alphabetic item

i. Roman item

- [x] Completed task
  - [ ] Nested task

> Outer quote
>
> > Nested quote

\`\`\`ts
const supported = true
\`\`\`

---

${basicTableProposalMarkdown}`

const proposalPresets: readonly ProposalPreset[] = [
  {
    id: "supported",
    label: "Supported structures",
    markdown: supportedProposalMarkdown,
    textSafeTarget: true,
  },
  {
    id: "basic-table",
    label: "Basic GFM table",
    markdown: basicTableProposalMarkdown,
    textSafeTarget: true,
  },
  {
    id: "safe-links",
    label: "Links: safe destinations",
    markdown:
      "[relative](/guide) [fragment](#section) [HTTPS](https://example.com) [email](mailto:team@example.com)",
    textSafeTarget: true,
  },
  {
    id: "unsafe-links",
    label: "Links: unsafe destinations",
    markdown:
      "[javascript](javascript:alert(1)) [data](data:text/html,unsafe) [protocol-relative](//example.com) [unknown](ftp://example.com)",
    textSafeTarget: true,
  },
  {
    id: "raw-html",
    label: "Raw HTML",
    markdown: "<div>Raw HTML is blocked.</div>",
    textSafeTarget: true,
  },
  {
    id: "generated-image",
    label: "Generated image",
    markdown: "![diagram](https://example.com/generated.png)",
    textSafeTarget: true,
  },
  {
    id: "html-table",
    label: "HTML table",
    markdown: "<table><tr><td>HTML table</td></tr></table>",
    textSafeTarget: true,
  },
  {
    id: "ragged-table",
    label: "Table: unequal columns",
    markdown: "| A | B |\n| --- | --- |\n| Only A |",
    textSafeTarget: true,
  },
  {
    id: "unclosed-fence",
    label: "Unclosed fenced code",
    markdown: "```ts\nconst incomplete = true",
    textSafeTarget: true,
  },
  {
    id: "schema-unsupported",
    label: "Schema-unsupported HTML structure",
    markdown: "<mark>Consumer schema does not expose this node.</mark>",
    textSafeTarget: false,
  },
]

const defaultSourcePreset = sourcePresets[0]!
const defaultProposalPreset = proposalPresets[0]!

export function Phase3ContentHarness() {
  const editor = useMemo(() => createHeadlessEditor(), [])
  const editorBaseline = snapshotEditor(editor)
  const [editorCheck, setEditorCheck] = useState<EditorCheck | null>(null)
  const [sourcePresetId, setSourcePresetId] = useState(defaultSourcePreset.id)
  const [targetJson, setTargetJson] = useState(
    jsonText(defaultSourcePreset.target)
  )
  const [contextJson, setContextJson] = useState(
    jsonText(defaultSourcePreset.context)
  )
  const [contextProjection, setContextProjection] = useState("")
  const [sourceInputError, setSourceInputError] = useState<string | null>(null)
  const [sourceResult, setSourceResult] =
    useState<EmendSourceMarkdownResult | null>(null)
  const [sourceRoundTrip, setSourceRoundTrip] =
    useState<SourceRoundTrip | null>(null)
  const [proposalPresetId, setProposalPresetId] = useState(
    defaultProposalPreset.id
  )
  const [rawProposal, setRawProposal] = useState(defaultProposalPreset.markdown)
  const [textSafeTarget, setTextSafeTarget] = useState(
    defaultProposalPreset.textSafeTarget
  )
  const [proposalDirty, setProposalDirty] = useState(false)
  const [prepared, setPrepared] = useState<EmendPreparedProposal | null>(null)

  useEffect(() => () => editor.destroy(), [editor])

  function handleSourcePresetChange(event: ChangeEvent<HTMLSelectElement>) {
    const preset = sourcePresets.find(({ id }) => id === event.target.value)
    if (!preset) return

    setSourcePresetId(preset.id)
    setTargetJson(jsonText(preset.target))
    setContextJson(jsonText(preset.context))
    setContextProjection(preset.contextProjection ?? "")
    setSourceInputError(null)
    setSourceResult(null)
    setSourceRoundTrip(null)
  }

  function handleProposalPresetChange(event: ChangeEvent<HTMLSelectElement>) {
    const preset = proposalPresets.find(({ id }) => id === event.target.value)
    if (!preset) return

    setProposalPresetId(preset.id)
    setRawProposal(preset.markdown)
    setTextSafeTarget(preset.textSafeTarget)
    setProposalDirty(false)
    setPrepared(null)
  }

  function handleSerializeSource() {
    const target = parseJsonInput(targetJson, true)
    const context = parseJsonInput(contextJson, false)

    if (target.error || context.error || !context.value) {
      setSourceInputError(
        target.error ?? context.error ?? "Context JSON is required."
      )
      setSourceResult(null)
      setSourceRoundTrip(null)
      return
    }

    setSourceInputError(null)
    const before = snapshotEditor(editor)
    const result = serializeSourceMarkdown({
      editor,
      target: target.value,
      context: context.value,
      contextProjection: contextProjection || undefined,
    })
    const after = snapshotEditor(editor)

    setSourceResult(result)
    setSourceRoundTrip(
      result.ok && result.source.targetMarkdown
        ? createRoundTrip(editor, result.source.targetMarkdown)
        : null
    )
    setEditorCheck({
      action: "Source Markdown serialization",
      before,
      after,
      unchanged: before === after,
    })
  }

  function handleFinalizeProposal() {
    const before = snapshotEditor(editor)
    const result = prepareProposalMarkdown({
      editor,
      markdown: rawProposal,
      textSafeTarget,
    })
    const after = snapshotEditor(editor)

    setPrepared(result)
    setProposalDirty(false)
    setEditorCheck({
      action: "Proposal finalization",
      before,
      after,
      unchanged: before === after,
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Headless editor invariant
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              The editor supplies the real schema and Markdown manager only. It
              is never mounted, edited, or mutated by this temporary harness.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-medium">
            {editorCheck?.unchanged === false ? "changed" : "unchanged"}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Baseline JSON bytes</dt>
            <dd className="mt-1 font-mono text-xs">{editorBaseline.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last action</dt>
            <dd className="mt-1">{editorCheck?.action ?? "No action yet"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last comparison</dt>
            <dd className="mt-1">
              {editorCheck
                ? editorCheck.unchanged
                  ? "Byte-for-byte equal"
                  : "Changed"
                : "Pending"}
            </dd>
          </div>
        </dl>
        {editorCheck && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <OutputCard
              title="Editor JSON before action"
              value={editorCheck.before}
            />
            <OutputCard
              title="Editor JSON after action"
              value={editorCheck.after}
            />
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Source Markdown
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Target and read-only context are serialized independently through
              the configured Tiptap Markdown manager.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Source preset
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={sourcePresetId}
              onChange={handleSourcePresetChange}
            >
              {sourcePresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Target JSON (use `null` for no edit target)
            <textarea
              className="min-h-40 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={targetJson}
              onChange={(event) => setTargetJson(event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Context JSON
            <textarea
              className="min-h-32 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={contextJson}
              onChange={(event) => setContextJson(event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Optional Context projection
            <textarea
              className="min-h-24 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={contextProjection}
              onChange={(event) => setContextProjection(event.target.value)}
              placeholder="Used only when Context JSON is unsupported."
            />
          </label>

          <Button onClick={handleSerializeSource}>Serialize source</Button>

          {sourceInputError && <ErrorMessage message={sourceInputError} />}
          {sourceResult && (
            <SourceResultView
              result={sourceResult}
              roundTrip={sourceRoundTrip}
            />
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Proposal Markdown
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Editing the textarea does not parse anything until the completed
              stream boundary is finalized explicitly.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Proposal preset
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={proposalPresetId}
              onChange={handleProposalPresetChange}
            >
              {proposalPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Raw proposal Markdown
            <textarea
              className="min-h-64 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={rawProposal}
              onChange={(event) => {
                setRawProposal(event.target.value)
                setProposalDirty(true)
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={textSafeTarget}
              onChange={(event) => {
                setTextSafeTarget(event.target.checked)
                setProposalDirty(true)
              }}
            />
            Target safely accepts plain text fallback
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleFinalizeProposal}>Finalize proposal</Button>
            {proposalDirty && (
              <span className="text-xs text-muted-foreground">
                Changed since last finalization; not reparsed.
              </span>
            )}
          </div>

          {prepared && <PreparedResultView result={prepared} />}
        </section>
      </div>
    </div>
  )
}

function parseJsonInput(
  value: string,
  allowNull: boolean
): { readonly value: JSONContent | null; readonly error: string | null } {
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed === null && allowNull) return { value: null, error: null }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: null, error: "JSON must be an object or null." }
    }
    return { value: parsed as JSONContent, error: null }
  } catch {
    return { value: null, error: "JSON could not be parsed." }
  }
}

function createHeadlessEditor(): Editor {
  return new Editor({
    element: null,
    editable: false,
    injectCSS: false,
    content: supportedDocument,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit,
      Markdown.configure({ markedOptions: { gfm: true } }),
    ],
  })
}

function snapshotEditor(editor: Editor): string {
  return jsonText(editor.getJSON())
}

function createRoundTrip(editor: Editor, markdown: string): SourceRoundTrip {
  const manager = editor.markdown
  if (!manager) throw new Error("The harness editor has no Markdown manager.")

  const parsed = manager.parse(markdown)
  const reserialized = manager.serialize(parsed)
  const reparsed = manager.parse(reserialized)

  return {
    parsed: jsonText(parsed),
    reserialized,
    reparsed: jsonText(reparsed),
  }
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? ""
}

function SourceResultView({
  result,
  roundTrip,
}: {
  readonly result: EmendSourceMarkdownResult
  readonly roundTrip: SourceRoundTrip | null
}) {
  if (!result.ok) return <ErrorMessage error={result.error} />

  return (
    <div className="space-y-4">
      <OutputCard
        title="Serialized target Markdown"
        value={result.source.targetMarkdown}
      />
      <OutputCard
        title="Serialized context Markdown"
        value={result.source.contextMarkdown}
      />
      <WarningList warnings={result.source.warnings} />
      {roundTrip && (
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Supported target JSON round trip
          </summary>
          <div className="mt-4 space-y-4">
            <OutputCard title="Parsed JSON" value={roundTrip.parsed} />
            <OutputCard
              title="Reserialized Markdown"
              value={roundTrip.reserialized}
            />
            <OutputCard
              title="JSON after reparsing reserialized Markdown"
              value={roundTrip.reparsed}
            />
          </div>
        </details>
      )}
    </div>
  )
}

function PreparedResultView({
  result,
}: {
  readonly result: EmendPreparedProposal
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Preparation outcome
        </p>
        <p className="mt-1 font-mono text-sm">{result.kind}</p>
      </div>
      <OutputCard title="Normalized Markdown" value={result.markdown} />
      {result.kind === "supported-markdown" && (
        <OutputCard title="Parsed JSON" value={jsonText(result.json)} />
      )}
      {result.kind === "plain-text-fallback" && (
        <OutputCard title="Exact plain-text fallback" value={result.text} />
      )}
      {result.kind === "blocked" && <ErrorMessage error={result.error} />}
      <WarningList warnings={result.warnings} />
    </div>
  )
}

function WarningList({
  warnings,
}: {
  readonly warnings: readonly EmendMarkdownWarning[]
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <p className="font-semibold">Warnings</p>
      {warnings.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {warnings.map((warning) => (
            <li key={`${warning.code}-${warning.message}`}>
              <span className="font-mono text-xs">{warning.code}</span>:{" "}
              {warning.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted-foreground">None</p>
      )}
    </div>
  )
}

function ErrorMessage({
  error,
  message,
}: {
  readonly error?: { readonly code: string; readonly message: string }
  readonly message?: string
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {error && <p className="font-mono text-xs font-semibold">{error.code}</p>}
      <p className="mt-1">{error?.message ?? message}</p>
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
    <div className="rounded-xl border border-border bg-background p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {value || "(empty)"}
      </pre>
    </div>
  )
}
