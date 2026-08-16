import type { EmendMarkdownWarning } from "./types.js"

export type MarkdownNormalizationResult =
  | { readonly ok: true; readonly markdown: string }
  | {
      readonly ok: false
      readonly markdown: string
      readonly warning: EmendMarkdownWarning
    }

export function normalizeCompleteMarkdown(
  markdown: string
): MarkdownNormalizationResult {
  const withoutBom = markdown.startsWith("\uFEFF")
    ? markdown.slice(1)
    : markdown
  const normalized = trimOuterBlankLines(withoutBom.replace(/\r\n?/g, "\n"))

  if (hasDisallowedControlCharacters(normalized)) {
    return {
      ok: false,
      markdown: normalized,
      warning: {
        code: "unsupported-markdown",
        message: "Markdown contains unsupported control characters.",
      },
    }
  }

  return { ok: true, markdown: normalized }
}

export function hasDisallowedControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return (
      (codePoint <= 0x1f && codePoint !== 0x09 && codePoint !== 0x0a) ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      codePoint === 0xfeff
    )
  })
}

function trimOuterBlankLines(markdown: string): string {
  const lines = markdown.split("\n")
  let start = 0
  let end = lines.length

  while (start < end && /^[ \t]*$/.test(lines[start] ?? "")) start += 1
  while (end > start && /^[ \t]*$/.test(lines[end - 1] ?? "")) end -= 1

  return lines.slice(start, end).join("\n")
}
