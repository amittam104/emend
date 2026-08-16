import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { createEmendError } from "../protocol/errors.js"
import {
  getMarkdownManager,
  inspectMarkdown,
  inspectTiptapContent,
} from "./inspect.js"
import { normalizeCompleteMarkdown } from "./normalize.js"
import { markdownTokensToPlainText } from "./plain-text.js"
import type {
  EmendMarkdownWarning,
  EmendPreparedProposal,
  PrepareProposalMarkdownOptions,
} from "./types.js"

const unsupportedWarning: EmendMarkdownWarning = {
  code: "unsupported-markdown",
  message: "Proposal Markdown is not safely supported by this editor.",
}

export function prepareProposalMarkdown(
  options: PrepareProposalMarkdownOptions
): EmendPreparedProposal {
  if (typeof options.markdown !== "string") {
    return blocked("", "schema_unsupported", [unsupportedWarning])
  }

  const normalized = normalizeCompleteMarkdown(options.markdown)
  const manager = getMarkdownManager(options.editor)
  if (!manager) {
    return blocked(
      normalized.markdown,
      "markdown_unavailable",
      normalized.ok ? [] : [normalized.warning]
    )
  }

  if (!normalized.ok) {
    return blocked(normalized.markdown, "schema_unsupported", [
      normalized.warning,
    ])
  }

  const inspection = inspectMarkdown(
    manager,
    normalized.markdown,
    options.linkProtocols
  )
  const warnings = [...inspection.warnings]

  if (!normalized.markdown) addWarning(warnings, unsupportedWarning)

  if (warnings.length === 0) {
    try {
      const json = manager.parse(normalized.markdown)
      const node = checkedNode(options.editor.schema.nodeFromJSON(json))
      const contentWarnings = inspectTiptapContent(node, options.linkProtocols)

      if (contentWarnings.length === 0) {
        return {
          kind: "supported-markdown",
          markdown: normalized.markdown,
          json,
          warnings: [],
        }
      }

      for (const warning of contentWarnings) addWarning(warnings, warning)
    } catch {
      addWarning(warnings, unsupportedWarning)
    }
  }

  const text = markdownTokensToPlainText(inspection.tokens)
  if (options.textSafeTarget && text.trim()) {
    addWarning(warnings, {
      code: "plain-text-fallback",
      message: "Formatting was removed for an explicit plain-text fallback.",
    })

    return {
      kind: "plain-text-fallback",
      markdown: normalized.markdown,
      text,
      warnings,
    }
  }

  return blocked(normalized.markdown, "schema_unsupported", warnings)
}

function checkedNode(node: ProseMirrorNode): ProseMirrorNode {
  node.check()
  return node
}

function blocked(
  markdown: string,
  code: "markdown_unavailable" | "schema_unsupported",
  warnings: readonly EmendMarkdownWarning[]
): EmendPreparedProposal {
  return {
    kind: "blocked",
    markdown,
    error: createEmendError(code),
    warnings,
  }
}

function addWarning(
  warnings: EmendMarkdownWarning[],
  warning: EmendMarkdownWarning
): void {
  if (!warnings.some(({ code }) => code === warning.code)) {
    warnings.push(warning)
  }
}
