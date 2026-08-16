import type { Editor, MarkdownToken } from "@tiptap/core"
import type { MarkdownManager } from "@tiptap/markdown"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { isSafeLinkDestination } from "./links.js"
import { SUPPORTED_MARKDOWN_MARKS, SUPPORTED_MARKDOWN_NODES } from "./policy.js"
import type { EmendMarkdownWarning } from "./types.js"

export interface MarkdownInspection {
  readonly tokens: readonly MarkdownToken[]
  readonly warnings: readonly EmendMarkdownWarning[]
}

export function getMarkdownManager(editor: Editor): MarkdownManager | null {
  const manager = editor?.markdown

  try {
    return manager &&
      typeof manager.parse === "function" &&
      typeof manager.serialize === "function" &&
      typeof manager.instance?.lexer === "function"
      ? manager
      : null
  } catch {
    return null
  }
}

export function inspectMarkdown(
  manager: MarkdownManager,
  markdown: string,
  linkProtocols?: readonly string[]
): MarkdownInspection {
  let tokens: MarkdownToken[]

  try {
    tokens = manager.instance.lexer(markdown) as MarkdownToken[]
  } catch {
    return {
      tokens: [],
      warnings: [
        {
          code: "unsupported-markdown",
          message: "Markdown could not be inspected safely.",
        },
      ],
    }
  }

  const warnings: EmendMarkdownWarning[] = []
  walkTokens(tokens, false, warnings, linkProtocols)

  return { tokens, warnings }
}

export function inspectTiptapContent(
  root: ProseMirrorNode,
  linkProtocols?: readonly string[]
): readonly EmendMarkdownWarning[] {
  const warnings: EmendMarkdownWarning[] = []

  inspectNode(root, warnings, linkProtocols)
  root.descendants((node) => {
    inspectNode(node, warnings, linkProtocols)
  })

  return warnings
}

function walkTokens(
  tokens: readonly MarkdownToken[],
  inTableCell: boolean,
  warnings: EmendMarkdownWarning[],
  linkProtocols?: readonly string[]
): void {
  for (const token of tokens) {
    if (token.type === "html" && !(inTableCell && token.raw === "<br>")) {
      addWarning(warnings, {
        code: "raw-html",
        message: "Raw HTML is not supported in AI content.",
      })
    }

    if (token.type === "image") {
      addWarning(warnings, {
        code: "generated-image",
        message: "Generated images are not supported in AI content.",
      })
    }

    if (
      (token.type === "link" || token.type === "def") &&
      !isSafeLinkDestination(token.href, linkProtocols)
    ) {
      addWarning(warnings, {
        code: "unsafe-link",
        message: "Markdown contains an unsafe link destination.",
      })
    }

    if (token.type === "code" && hasUnclosedFence(token)) {
      addWarning(warnings, {
        code: "unsupported-markdown",
        message: "Markdown contains an unclosed fenced code block.",
      })
    }

    if (token.type === "table") {
      for (const cell of tableCells(token)) {
        walkTokens(cell.tokens ?? [], true, warnings, linkProtocols)
      }
    }

    walkTokens(token.tokens ?? [], inTableCell, warnings, linkProtocols)
    walkTokens(token.items ?? [], inTableCell, warnings, linkProtocols)
    walkTokens(token.nestedTokens ?? [], inTableCell, warnings, linkProtocols)
  }
}

function tableCells(token: MarkdownToken): MarkdownToken[] {
  const header = Array.isArray(token.header) ? token.header : []
  const rows = Array.isArray(token.rows) ? token.rows.flat() : []
  return [...header, ...rows]
}

function hasUnclosedFence(token: MarkdownToken): boolean {
  if (typeof token.raw !== "string" || token.codeBlockStyle === "indented") {
    return false
  }

  const opening = token.raw.match(/^ {0,3}(`{3,}|~{3,})[^\n]*(?:\n|$)/)
  if (!opening) return false

  const fence = opening[1]
  const lines = token.raw.replace(/\n$/, "").split("\n")
  if (!fence || lines.length < 2) return true

  const closingPattern = new RegExp(
    `^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`
  )
  return !closingPattern.test(lines.at(-1) ?? "")
}

function inspectNode(
  node: ProseMirrorNode,
  warnings: EmendMarkdownWarning[],
  linkProtocols?: readonly string[]
): void {
  if (!SUPPORTED_MARKDOWN_NODES.has(node.type.name)) {
    addWarning(
      warnings,
      node.type.name === "image"
        ? {
            code: "generated-image",
            message: "Generated images are not supported in AI content.",
          }
        : {
            code: "unsupported-markdown",
            message: `The ${node.type.name} node is outside Supported Markdown.`,
          }
    )
  }

  for (const mark of node.marks) {
    if (!SUPPORTED_MARKDOWN_MARKS.has(mark.type.name)) {
      addWarning(warnings, {
        code: "unsupported-markdown",
        message: `The ${mark.type.name} mark is outside Supported Markdown.`,
      })
    }

    if (
      mark.type.name === "link" &&
      !isSafeLinkDestination(mark.attrs.href, linkProtocols)
    ) {
      addWarning(warnings, {
        code: "unsafe-link",
        message: "Markdown contains an unsafe link destination.",
      })
    }
  }

  if (node.type.name === "table" && !isBasicTable(node)) {
    addWarning(warnings, {
      code: "unsupported-markdown",
      message: "The table is outside Emend's basic table profile.",
    })
  }
}

function isBasicTable(table: ProseMirrorNode): boolean {
  if (table.childCount === 0) return false

  const columnCount = table.child(0).childCount
  if (columnCount === 0) return false

  for (let rowIndex = 0; rowIndex < table.childCount; rowIndex += 1) {
    const row = table.child(rowIndex)
    if (row.type.name !== "tableRow" || row.childCount !== columnCount) {
      return false
    }

    const expectedCell = rowIndex === 0 ? "tableHeader" : "tableCell"

    for (let cellIndex = 0; cellIndex < row.childCount; cellIndex += 1) {
      const cell = row.child(cellIndex)
      if (
        cell.type.name !== expectedCell ||
        (cell.attrs.colspan ?? 1) !== 1 ||
        (cell.attrs.rowspan ?? 1) !== 1 ||
        cell.attrs.colwidth != null ||
        cell.childCount !== 1 ||
        cell.child(0).type.name !== "paragraph"
      ) {
        return false
      }
    }
  }

  return true
}

function addWarning(
  warnings: EmendMarkdownWarning[],
  warning: EmendMarkdownWarning
): void {
  if (!warnings.some(({ code }) => code === warning.code)) {
    warnings.push(warning)
  }
}
