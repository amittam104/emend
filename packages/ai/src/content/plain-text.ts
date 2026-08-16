import { decodeHtmlEntities, type MarkdownToken } from "@tiptap/core"

export function markdownTokensToPlainText(
  tokens: readonly MarkdownToken[]
): string {
  return renderBlocks(tokens).filter(Boolean).join("\n\n")
}

function renderBlocks(tokens: readonly MarkdownToken[]): string[] {
  const blocks: string[] = []

  for (const token of tokens) {
    switch (token.type) {
      case "space":
      case "def":
      case "html":
        break
      case "paragraph":
      case "heading":
        blocks.push(renderInline(token.tokens ?? []))
        break
      case "blockquote":
        blocks.push(renderBlocks(token.tokens ?? []).join("\n\n"))
        break
      case "code":
        blocks.push(text(token))
        break
      case "list":
        blocks.push(renderList(token))
        break
      case "table":
        blocks.push(renderTable(token))
        break
      case "hr":
        blocks.push("")
        break
      default:
        blocks.push(renderInline([token]))
    }
  }

  return blocks
}

function renderInline(tokens: readonly MarkdownToken[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case "html":
          return token.raw === "<br>" ? "\n" : ""
        case "image": {
          const alt = renderInline(token.tokens ?? []) || text(token)
          return alt ? `[Image: ${alt}]` : ""
        }
        case "link":
          return renderInline(token.tokens ?? []) || text(token)
        case "br":
          return "\n"
        case "text":
        case "escape":
        case "codespan":
          return token.tokens?.length ? renderInline(token.tokens) : text(token)
        default:
          return token.tokens?.length ? renderInline(token.tokens) : text(token)
      }
    })
    .join("")
}

function renderList(token: MarkdownToken): string {
  const items = token.items ?? []
  const start = typeof token.start === "number" ? token.start : 1

  return items
    .map((item, index) => {
      const marker = token.ordered
        ? `${start + index}.`
        : item.task
          ? `- [${item.checked ? "x" : " "}]`
          : "-"
      const content =
        renderBlocks(item.tokens ?? [])
          .filter(Boolean)
          .join("\n\n") || text(item)
      const [firstLine = "", ...remainingLines] = content.split("\n")
      const continuation = remainingLines.map((line) => `  ${line}`).join("\n")

      return `${marker}${firstLine ? ` ${firstLine}` : ""}${continuation ? `\n${continuation}` : ""}`
    })
    .join("\n")
}

function renderTable(token: MarkdownToken): string {
  const header = Array.isArray(token.header) ? [token.header] : []
  const rows = Array.isArray(token.rows) ? token.rows : []

  return [...header, ...rows]
    .map((row) =>
      row
        .map((cell: MarkdownToken) => renderInline(cell.tokens ?? []))
        .join("\t")
    )
    .join("\n")
}

function text(token: MarkdownToken): string {
  return decodeHtmlEntities(typeof token.text === "string" ? token.text : "")
}
