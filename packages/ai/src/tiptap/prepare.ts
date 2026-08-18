import type { Editor } from "@tiptap/core"
import { getMarkdownManager, inspectMarkdown } from "../content/inspect.js"
import { markdownTokensToPlainText } from "../content/plain-text.js"
import { prepareProposalMarkdown } from "../content/prepare.js"
import type { EmendMarkdownWarning } from "../content/types.js"
import { createProposal, type EmendProposal } from "../proposal/index.js"
import {
  createEmendError,
  type EmendAiError,
  type EmendErrorCode,
} from "../protocol/errors.js"
import type {
  EmendSchemaCapabilities,
  EmendSelectionRange,
} from "../protocol/types.js"
import {
  getTiptapSourceRevision,
  sameTiptapSourceRevision,
} from "./revision.js"
import {
  canReplaceTiptapRange,
  createPlainTextTiptapSlice,
  createSupportedTiptapSlice,
} from "./slice.js"
import type {
  EmendBlockedTiptapPreparation,
  EmendCapturedTarget,
  EmendPlainTextTiptapPreparation,
  EmendSupportedTiptapPreparation,
  EmendTiptapCapture,
  EmendTiptapPreparation,
  EmendTiptapPrepareOptions,
} from "./types.js"

const fallbackWarning: EmendMarkdownWarning = {
  code: "plain-text-fallback",
  message: "Formatting was removed for an explicit plain-text fallback.",
}

export function prepareTiptapProposal(
  editor: Editor | null | undefined,
  proposal: EmendProposal,
  capture: EmendTiptapCapture,
  options?: EmendTiptapPrepareOptions
): EmendTiptapPreparation {
  const editedMarkdown = options?.editedMarkdown
  const userModified = editedMarkdown !== undefined || proposal.userModified

  if (
    typeof editedMarkdown !== "undefined" &&
    typeof editedMarkdown !== "string"
  ) {
    return blocked(proposal, "", userModified, "invalid_request")
  }

  const rawMarkdown = editedMarkdown ?? proposal.content.value
  if (!editor || editor.isDestroyed) {
    return blocked(proposal, rawMarkdown, userModified, "editor_not_configured")
  }

  const target = validateBinding(proposal, capture)
  if (!target) {
    return blocked(proposal, rawMarkdown, userModified, "invalid_request")
  }

  const currentRevision = getTiptapSourceRevision(editor)
  if (!currentRevision.ok) {
    return blocked(proposal, rawMarkdown, userModified, currentRevision.error)
  }
  if (
    !sameTiptapSourceRevision(
      currentRevision.revision,
      capture.protocol.sourceRevision
    ) ||
    !isCurrentTarget(editor, target)
  ) {
    return blocked(proposal, rawMarkdown, userModified, "stale_revision")
  }

  const proposalView =
    editedMarkdown === undefined
      ? proposal
      : createProposal({
          id: proposal.id,
          actionId: proposal.actionId,
          request: proposal.request,
          content: { format: "markdown", value: editedMarkdown },
          userModified: true,
        })
  const prepared = prepareProposalMarkdown({
    editor,
    markdown: proposalView.content.value,
    textSafeTarget: target.textSafe,
    linkProtocols: options?.linkProtocols,
  })

  if (prepared.kind === "blocked") {
    return blocked(
      proposalView,
      rawMarkdown,
      proposalView.userModified,
      prepared.error,
      prepared.warnings,
      prepared.markdown
    )
  }

  if (prepared.kind === "supported-markdown") {
    const slice = createSupportedTiptapSlice(editor, target, prepared.json)
    if (slice && canReplaceTiptapRange(editor, target, slice)) {
      return supported(
        editor,
        proposalView,
        target,
        prepared.markdown,
        slice,
        prepared.warnings
      )
    }

    const text = target.textSafe
      ? derivePlainText(editor, prepared.markdown, options?.linkProtocols)
      : null
    const fallbackSlice = text
      ? createPlainTextTiptapSlice(editor, target, text)
      : null

    if (
      text &&
      fallbackSlice &&
      canReplaceTiptapRange(editor, target, fallbackSlice)
    ) {
      return plainText(
        editor,
        proposalView,
        target,
        prepared.markdown,
        text,
        fallbackSlice,
        addWarning(prepared.warnings, fallbackWarning)
      )
    }

    return blocked(
      proposalView,
      rawMarkdown,
      proposalView.userModified,
      "schema_unsupported",
      prepared.warnings,
      prepared.markdown
    )
  }

  const slice = createPlainTextTiptapSlice(editor, target, prepared.text)
  return slice && canReplaceTiptapRange(editor, target, slice)
    ? plainText(
        editor,
        proposalView,
        target,
        prepared.markdown,
        prepared.text,
        slice,
        prepared.warnings
      )
    : blocked(
        proposalView,
        rawMarkdown,
        proposalView.userModified,
        "schema_unsupported",
        prepared.warnings,
        prepared.markdown
      )
}

function validateBinding(
  proposal: EmendProposal,
  capture: EmendTiptapCapture
): EmendCapturedTarget | null {
  const request = proposal.request
  const protocol = capture.protocol
  const target = capture.target

  if (
    proposal.content.format !== "markdown" ||
    request.interactionMode !== "edit" ||
    request.actionId !== proposal.actionId ||
    request.mutationOperation === null ||
    request.targetRange === null ||
    protocol.mutationOperation === null ||
    protocol.targetRange === null ||
    !target
  ) {
    return null
  }

  if (
    request.targetScope !== protocol.targetScope ||
    request.contextScope !== protocol.contextScope ||
    request.mutationOperation !== protocol.mutationOperation ||
    request.targetMarkdown !== protocol.targetMarkdown ||
    request.contextMarkdown !== protocol.contextMarkdown ||
    !sameRange(request.targetRange, protocol.targetRange) ||
    !sameTiptapSourceRevision(
      request.sourceRevision,
      protocol.sourceRevision
    ) ||
    !sameCapabilities(request.schemaCapabilities, protocol.schemaCapabilities)
  ) {
    return null
  }

  return target.mutationOperation === protocol.mutationOperation &&
    sameRange(target.range, protocol.targetRange)
    ? target
    : null
}

function isCurrentTarget(editor: Editor, target: EmendCapturedTarget): boolean {
  try {
    return editor.state.doc
      .slice(target.range.from, target.range.to)
      .eq(target.slice)
  } catch {
    return false
  }
}

function derivePlainText(
  editor: Editor,
  markdown: string,
  linkProtocols?: readonly string[]
): string | null {
  const manager = getMarkdownManager(editor)
  if (!manager) return null

  const inspection = inspectMarkdown(manager, markdown, linkProtocols)
  if (inspection.warnings.length > 0) return null

  const text = markdownTokensToPlainText(inspection.tokens)
  return text.trim() ? text : null
}

function supported(
  editor: Editor,
  proposal: EmendProposal,
  target: EmendCapturedTarget,
  normalizedMarkdown: string,
  slice: EmendSupportedTiptapPreparation["slice"],
  warnings: readonly EmendMarkdownWarning[]
): EmendSupportedTiptapPreparation {
  return Object.freeze({
    kind: "supported-markdown",
    proposalId: proposal.id,
    actionId: proposal.actionId,
    targetRange: freezeRange(target.range),
    sourceRevision: Object.freeze({ ...proposal.request.sourceRevision }),
    normalizedMarkdown,
    slice,
    preview: slice.content,
    warnings: freezeWarnings(warnings),
    requiresDocumentConfirmation:
      target.mutationOperation === "replace-document" && !editor.isEmpty,
    userModified: proposal.userModified,
  })
}

function plainText(
  editor: Editor,
  proposal: EmendProposal,
  target: EmendCapturedTarget,
  normalizedMarkdown: string,
  text: string,
  slice: EmendPlainTextTiptapPreparation["slice"],
  warnings: readonly EmendMarkdownWarning[]
): EmendPlainTextTiptapPreparation {
  return Object.freeze({
    kind: "plain-text-fallback",
    proposalId: proposal.id,
    actionId: proposal.actionId,
    targetRange: freezeRange(target.range),
    sourceRevision: Object.freeze({ ...proposal.request.sourceRevision }),
    normalizedMarkdown,
    text,
    slice,
    preview: slice.content,
    warnings: freezeWarnings(warnings),
    requiresDocumentConfirmation:
      target.mutationOperation === "replace-document" && !editor.isEmpty,
    userModified: proposal.userModified,
  })
}

function blocked(
  proposal: EmendProposal,
  rawMarkdown: string,
  userModified: boolean,
  error: EmendAiError | EmendErrorCode,
  warnings: readonly EmendMarkdownWarning[] = [],
  normalizedMarkdown?: string
): EmendBlockedTiptapPreparation {
  const resolvedError =
    typeof error === "string" ? createEmendError(error) : error

  return Object.freeze({
    kind: "blocked",
    proposalId: proposal.id,
    actionId: proposal.actionId,
    rawMarkdown,
    ...(normalizedMarkdown !== undefined ? { normalizedMarkdown } : {}),
    warnings: freezeWarnings(warnings),
    error: Object.freeze({ ...resolvedError }),
    userModified,
  })
}

function sameRange(
  left: EmendSelectionRange,
  right: EmendSelectionRange
): boolean {
  return left.from === right.from && left.to === right.to
}

function sameCapabilities(
  left: EmendSchemaCapabilities,
  right: EmendSchemaCapabilities
): boolean {
  return (
    left.markdown === right.markdown &&
    sameStrings(left.nodes, right.nodes) &&
    sameStrings(left.marks, right.marks)
  )
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function addWarning(
  warnings: readonly EmendMarkdownWarning[],
  warning: EmendMarkdownWarning
): readonly EmendMarkdownWarning[] {
  return warnings.some(({ code }) => code === warning.code)
    ? warnings
    : [...warnings, warning]
}

function freezeRange(range: EmendSelectionRange): EmendSelectionRange {
  return Object.freeze({ from: range.from, to: range.to })
}

function freezeWarnings(
  warnings: readonly EmendMarkdownWarning[]
): readonly EmendMarkdownWarning[] {
  return Object.freeze(warnings.map((warning) => Object.freeze({ ...warning })))
}
