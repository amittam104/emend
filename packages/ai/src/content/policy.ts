export const SUPPORTED_MARKDOWN_NODES: ReadonlySet<string> = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
])

export const SUPPORTED_MARKDOWN_MARKS: ReadonlySet<string> = new Set([
  "bold",
  "italic",
  "strike",
  "code",
  "link",
  "underline",
])

export const DEFAULT_LINK_PROTOCOLS = ["http:", "https:", "mailto:"] as const
