import type { JSONContent } from "@tiptap/core"
import type { MarkdownManager } from "@tiptap/markdown"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { createEmendError } from "../protocol/errors.js"
import { DEFAULT_REQUEST_LIMITS } from "../protocol/types.js"
import {
  getMarkdownManager,
  inspectMarkdown,
  inspectTiptapContent,
} from "./inspect.js"
import { hasDisallowedControlCharacters } from "./normalize.js"
import type {
  EmendSourceMarkdownResult,
  SerializeSourceMarkdownOptions,
} from "./types.js"

const contextProjectionLabel =
  "Context projection — plain text; structure or formatting may be omitted."

export function serializeSourceMarkdown(
  options: SerializeSourceMarkdownOptions
): EmendSourceMarkdownResult {
  const manager = getMarkdownManager(options.editor)
  if (!manager) return failure("markdown_unavailable")

  const limits = resolveLimits(options.limits)
  if (!limits) return failure("invalid_request")

  let targetMarkdown = ""
  if (options.target !== null) {
    const target = serializeContent(
      options.editor.schema,
      manager,
      options.target,
      options.linkProtocols
    )
    if (!target) return failure("schema_unsupported")
    targetMarkdown = target.markdown
  }

  const context = serializeContent(
    options.editor.schema,
    manager,
    options.context,
    options.linkProtocols
  )
  let contextMarkdown: string
  const warnings = []

  if (context) {
    contextMarkdown = context.markdown
  } else {
    const projection = options.contextProjection?.replace(/\r\n?/g, "\n")
    if (
      typeof projection !== "string" ||
      hasDisallowedControlCharacters(projection)
    ) {
      return failure("schema_unsupported")
    }

    contextMarkdown = formatContextProjection(projection)
    warnings.push({
      code: "context-projected" as const,
      message:
        "Read-only context was supplied as a labelled plain-text projection.",
    })
  }

  if (
    targetMarkdown.length > limits.maxTargetMarkdownLength ||
    contextMarkdown.length > limits.maxContextMarkdownLength
  ) {
    return failure("context_too_large")
  }

  return {
    ok: true,
    source: { targetMarkdown, contextMarkdown, warnings },
  }
}

function serializeContent(
  schema: SerializeSourceMarkdownOptions["editor"]["schema"],
  manager: MarkdownManager,
  json: JSONContent,
  linkProtocols?: readonly string[]
): { readonly markdown: string } | null {
  try {
    const original = checkedNode(schema.nodeFromJSON(json))
    if (inspectTiptapContent(original, linkProtocols).length > 0) return null

    const markdown = manager.serialize(original.toJSON())
    if (inspectMarkdown(manager, markdown, linkProtocols).warnings.length > 0) {
      return null
    }

    const reparsed = checkedNode(schema.nodeFromJSON(manager.parse(markdown)))
    if (inspectTiptapContent(reparsed, linkProtocols).length > 0) return null
    if (!original.eq(reparsed)) return null

    return { markdown }
  } catch {
    return null
  }
}

function checkedNode(node: ProseMirrorNode): ProseMirrorNode {
  node.check()
  return node
}

function resolveLimits(configured: SerializeSourceMarkdownOptions["limits"]): {
  readonly maxTargetMarkdownLength: number
  readonly maxContextMarkdownLength: number
} | null {
  const limits = {
    maxTargetMarkdownLength:
      configured?.maxTargetMarkdownLength ??
      DEFAULT_REQUEST_LIMITS.maxTargetMarkdownLength,
    maxContextMarkdownLength:
      configured?.maxContextMarkdownLength ??
      DEFAULT_REQUEST_LIMITS.maxContextMarkdownLength,
  }

  return Object.values(limits).every(
    (value) => Number.isInteger(value) && value >= 0
  )
    ? limits
    : null
}

function formatContextProjection(projection: string): string {
  const longestFence = Math.max(
    0,
    ...(projection.match(/`+/g) ?? []).map(({ length }) => length)
  )
  const fence = "`".repeat(Math.max(3, longestFence + 1))
  const body = projection.endsWith("\n") ? projection : `${projection}\n`

  return `${contextProjectionLabel}\n\n${fence}text\n${body}${fence}`
}

function failure(
  code:
    | "context_too_large"
    | "invalid_request"
    | "markdown_unavailable"
    | "schema_unsupported"
): EmendSourceMarkdownResult {
  return { ok: false, error: createEmendError(code) }
}
