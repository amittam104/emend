import type { Editor } from "@tiptap/core"
import { closeHistory } from "@tiptap/pm/history"
import type { EmendProposal } from "../proposal/index.js"
import { createEmendError, type EmendAiError } from "../protocol/errors.js"
import type {
  EmendSchemaCapabilities,
  EmendSelectionRange,
} from "../protocol/types.js"
import { normalizeCompleteMarkdown } from "../content/normalize.js"
import { canReplaceTiptapRange } from "./slice.js"
import {
  getEmendAiPluginKey,
  getEmendAiPluginState,
  getTiptapSourceRevision,
  sameTiptapSourceRevision,
} from "./revision.js"
import type {
  EmendCapturedTarget,
  EmendTiptapApplyOptions,
  EmendTiptapApplyResult,
  EmendTiptapCapture,
  EmendTiptapPreparation,
  EmendTiptapPreviewKind,
  EmendTiptapShowProposalOptions,
} from "./types.js"

export const EMEND_AI_TRANSACTION_META = "emend-ai:transaction"

export interface EmendAiTransactionMeta {
  readonly origin: "emend-ai"
  readonly proposalId: string
  readonly actionId: EmendProposal["actionId"]
  readonly userModified: boolean
}

export interface EmendTiptapShowOptions {
  readonly inlinePreview?: boolean
}

export function showTiptapProposal(
  editor: Editor | null | undefined,
  capture: EmendTiptapCapture,
  proposal: EmendProposal,
  preparation: EmendTiptapPreparation,
  options: EmendTiptapShowOptions = {}
): EmendTiptapApplyResult {
  const configuredEditor = getConfiguredEditor(editor)
  if (!configuredEditor)
    return failure(createEmendError("editor_not_configured"))
  editor = configuredEditor
  if (preparation.kind === "blocked") return failure(preparation.error)
  if (!isBound(preparation, proposal, capture)) {
    return failure(createEmendError("invalid_request"))
  }

  const current = getTiptapSourceRevision(editor)
  if (!current.ok) return failure(current.error)
  if (
    !sameTiptapSourceRevision(current.revision, capture.protocol.sourceRevision)
  ) {
    return failure(createEmendError("stale_revision"))
  }

  const target = capture.target
  if (!target || !isCurrentTarget(editor, target)) {
    return failure(createEmendError("stale_revision"))
  }

  const pluginState = getEmendAiPluginState(editor.state)
  if (!pluginState) return failure(createEmendError("editor_not_configured"))
  if (pluginState.stale) return failure(createEmendError("stale_revision"))
  if (
    pluginState.activeProposalId !== null &&
    pluginState.activeProposalId !== proposal.id
  ) {
    return failure(createEmendError("pending_review"))
  }

  const inlinePreview = options.inlinePreview ?? true
  const showOptions: EmendTiptapShowProposalOptions = {
    proposalId: proposal.id,
    targetRange: preparation.targetRange,
    sourceRevision: preparation.sourceRevision,
    ...(inlinePreview
      ? {
          preview: preparation.preview,
          previewKind: preparation.kind as EmendTiptapPreviewKind,
          previewPlacement: target.placement,
        }
      : {}),
  }

  try {
    editor.view.dispatch(
      editor.state.tr
        .setMeta(getEmendAiPluginKey(), { type: "show", options: showOptions })
        .setMeta("addToHistory", false)
    )
    return success()
  } catch {
    return failure(createEmendError("apply_failed"))
  }
}

export function clearTiptapProposal(
  editor: Editor | null | undefined,
  proposalId?: string
): EmendTiptapApplyResult {
  const configuredEditor = getConfiguredEditor(editor)
  if (!configuredEditor)
    return failure(createEmendError("editor_not_configured"))
  editor = configuredEditor

  const pluginState = getEmendAiPluginState(editor.state)
  if (!pluginState) return failure(createEmendError("editor_not_configured"))
  if (
    proposalId !== undefined &&
    pluginState.activeProposalId !== null &&
    pluginState.activeProposalId !== proposalId
  ) {
    return failure(createEmendError("pending_review"))
  }

  try {
    editor.view.dispatch(
      editor.state.tr
        .setMeta(getEmendAiPluginKey(), { type: "clear", proposalId })
        .setMeta("addToHistory", false)
    )
    return success()
  } catch {
    return failure(createEmendError("apply_failed"))
  }
}

export function acceptTiptapProposal(
  editor: Editor | null | undefined,
  capture: EmendTiptapCapture,
  options: EmendTiptapApplyOptions
): EmendTiptapApplyResult {
  const configuredEditor = getConfiguredEditor(editor)
  if (!configuredEditor)
    return failure(createEmendError("editor_not_configured"))
  editor = configuredEditor

  const { preparation, proposal } = options
  if (preparation.kind === "blocked") return failure(preparation.error)
  if (!isBound(preparation, proposal, capture)) {
    return failure(createEmendError("invalid_request"))
  }

  const current = getTiptapSourceRevision(editor)
  if (!current.ok) return failure(current.error)
  if (
    !sameTiptapSourceRevision(current.revision, capture.protocol.sourceRevision)
  ) {
    return failure(createEmendError("stale_revision"))
  }

  const pluginState = getEmendAiPluginState(editor.state)
  const target = capture.target
  if (!pluginState || !target) {
    return failure(createEmendError("editor_not_configured"))
  }
  if (pluginState.activeProposalId === null) {
    return failure(createEmendError("invalid_request"))
  }
  if (pluginState.activeProposalId !== proposal.id) {
    return failure(createEmendError("pending_review"))
  }
  if (pluginState.stale) return failure(createEmendError("stale_revision"))
  if (
    !pluginState.targetRange ||
    !sameRange(pluginState.targetRange, preparation.targetRange) ||
    !pluginState.sourceRevision ||
    !sameTiptapSourceRevision(
      pluginState.sourceRevision,
      preparation.sourceRevision
    )
  ) {
    return failure(createEmendError("invalid_request"))
  }

  if (!isCurrentTarget(editor, target)) {
    return failure(createEmendError("stale_revision"))
  }

  const normalized = normalizeCompleteMarkdown(proposal.content.value)
  if (
    !normalized.ok ||
    normalized.markdown !== preparation.normalizedMarkdown ||
    preparation.userModified !== proposal.userModified
  ) {
    return failure(createEmendError("invalid_request"))
  }

  const requiresConfirmation =
    preparation.requiresDocumentConfirmation ||
    (proposal.request.mutationOperation === "replace-document" &&
      !editor.isEmpty)
  if (requiresConfirmation && options.confirmDocumentReplacement !== true) {
    return failure(createEmendError("confirmation_required"))
  }

  if (!canReplaceTiptapRange(editor, target, preparation.slice)) {
    return failure(createEmendError("schema_unsupported"))
  }

  try {
    const transaction = editor.state.tr.replace(
      target.range.from,
      target.range.to,
      preparation.slice
    )
    transaction.doc.check()
    if (!transaction.docChanged || transaction.steps.length !== 1) {
      return failure(createEmendError("apply_failed"))
    }

    const metadata: EmendAiTransactionMeta = Object.freeze({
      origin: "emend-ai",
      proposalId: proposal.id,
      actionId: proposal.actionId,
      userModified: preparation.userModified,
    })
    const accepted = closeHistory(
      transaction
        .setMeta(EMEND_AI_TRANSACTION_META, metadata)
        .setMeta(getEmendAiPluginKey(), {
          type: "accept",
          proposalId: proposal.id,
        })
        .setMeta("addToHistory", true)
    )

    editor.view.dispatch(accepted)
    return success()
  } catch {
    return failure(createEmendError("apply_failed"))
  }
}

function getConfiguredEditor(editor: Editor | null | undefined): Editor | null {
  if (!editor || editor.isDestroyed || !getEmendAiPluginState(editor.state)) {
    return null
  }
  return editor
}

function isBound(
  preparation: Exclude<EmendTiptapPreparation, { readonly kind: "blocked" }>,
  proposal: EmendProposal,
  capture: EmendTiptapCapture
): boolean {
  const request = proposal.request
  const protocol = capture.protocol
  const target = capture.target

  return (
    proposal.content.format === "markdown" &&
    request.interactionMode === "edit" &&
    request.actionId === proposal.actionId &&
    request.mutationOperation !== null &&
    request.targetRange !== null &&
    protocol.mutationOperation === request.mutationOperation &&
    protocol.targetRange !== null &&
    target !== null &&
    target.mutationOperation === request.mutationOperation &&
    sameRange(request.targetRange, protocol.targetRange) &&
    sameRange(target.range, protocol.targetRange) &&
    sameRange(preparation.targetRange, request.targetRange) &&
    sameTiptapSourceRevision(request.sourceRevision, protocol.sourceRevision) &&
    sameTiptapSourceRevision(
      preparation.sourceRevision,
      protocol.sourceRevision
    ) &&
    sameCapabilities(request.schemaCapabilities, protocol.schemaCapabilities) &&
    request.targetScope === protocol.targetScope &&
    request.contextScope === protocol.contextScope &&
    request.targetMarkdown === protocol.targetMarkdown &&
    request.contextMarkdown === protocol.contextMarkdown &&
    preparation.proposalId === proposal.id &&
    preparation.actionId === proposal.actionId
  )
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

function sameStrings(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function success(): EmendTiptapApplyResult {
  return { ok: true }
}

function failure(error: EmendAiError): EmendTiptapApplyResult {
  return { ok: false, error: Object.freeze({ ...error }) }
}
