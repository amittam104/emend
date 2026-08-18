import type { Editor } from "@tiptap/core"
import { createProposal, type EmendProposal } from "../proposal/index.js"
import { createEmendError } from "../protocol/errors.js"
import type { EmendCaptureOptions } from "../protocol/controller.js"
import type {
  EmendCaptureResult,
  EmendSourceRevision,
} from "../protocol/types.js"
import { captureTiptapContent } from "./capture.js"
import {
  acceptTiptapProposal,
  clearTiptapProposal,
  showTiptapProposal,
  type EmendTiptapShowOptions,
} from "./apply.js"
import { prepareTiptapProposal } from "./prepare.js"
import { isTiptapSourceRevisionCurrent } from "./revision.js"
import { getEmendAiEditorState } from "./extension.js"
import type {
  EmendTiptapCapture,
  EmendTiptapCaptureOptions,
  EmendTiptapEditorState,
  EmendTiptapPreparation,
} from "./types.js"
import type { EmendTiptapApplyResult } from "./types.js"

export interface EmendTiptapAdapterOptions {
  readonly limits?: EmendTiptapCaptureOptions["limits"]
  readonly linkProtocols?: readonly string[]
  readonly contextProjection?: string
}

export interface EmendTiptapAdapter {
  readonly capture: (options: EmendCaptureOptions) => EmendCaptureResult
  readonly isSourceRevisionCurrent: (revision: EmendSourceRevision) => boolean
  readonly prepare: (
    proposal: EmendProposal,
    editedMarkdown?: string
  ) => EmendTiptapPreparation
  readonly show: (
    proposal: EmendProposal,
    preparation: EmendTiptapPreparation,
    options?: EmendTiptapShowOptions
  ) => EmendTiptapApplyResult
  readonly accept: (
    proposal: EmendProposal,
    preparation: EmendTiptapPreparation,
    options: { readonly confirmDocumentReplacement: boolean }
  ) => EmendTiptapApplyResult
  readonly reject: (proposalId?: string) => EmendTiptapApplyResult
  readonly getEditorState: () => EmendTiptapEditorState | null
  readonly destroy: () => void
}

export function createEmendTiptapAdapter(
  editor: Editor,
  options: EmendTiptapAdapterOptions = {}
): EmendTiptapAdapter {
  let activeCapture: EmendTiptapCapture | null = null
  let preparedProposal: EmendProposal | null = null
  let sourceProposal: EmendProposal | null = null
  let destroyed = false

  const adapter: EmendTiptapAdapter = {
    capture(captureOptions) {
      if (destroyed) throw createEmendError("editor_not_configured")

      const result = captureTiptapContent(editor, {
        ...captureOptions,
        limits: options.limits,
        linkProtocols: options.linkProtocols,
        contextProjection: options.contextProjection,
      })
      if (!result.ok) throw result.error

      if (captureOptions.mutationOperation !== null) {
        const current = getEmendAiEditorState(editor)
        if (current?.activeProposalId) {
          const cleared = clearTiptapProposal(editor, current.activeProposalId)
          if (!cleared.ok) throw cleared.error
        }
        activeCapture = result.capture
        preparedProposal = null
        sourceProposal = null
      }

      return result.capture.protocol
    },

    isSourceRevisionCurrent(revision) {
      return !destroyed && isTiptapSourceRevisionCurrent(editor, revision)
    },

    prepare(proposal, editedMarkdown) {
      const capture = activeCapture
      const userModified = editedMarkdown !== undefined || proposal.userModified
      if (destroyed || !capture) {
        return blockedPreparation(
          proposal,
          editedMarkdown ?? proposal.content.value,
          userModified,
          destroyed ? "editor_not_configured" : "invalid_request"
        )
      }

      const prepared = prepareTiptapProposal(editor, proposal, capture, {
        editedMarkdown,
        linkProtocols: options.linkProtocols,
      })
      preparedProposal = createReviewedProposal(proposal, editedMarkdown)
      sourceProposal = proposal
      return prepared
    },

    show(proposal, preparation, showOptions) {
      const capture = activeCapture
      if (destroyed || !capture) {
        return failure(destroyed ? "editor_not_configured" : "invalid_request")
      }

      return showTiptapProposal(
        editor,
        capture,
        getReviewedProposal(proposal),
        preparation,
        showOptions
      )
    },

    accept(proposal, preparation, acceptOptions) {
      const capture = activeCapture
      if (destroyed || !capture) {
        return failure(destroyed ? "editor_not_configured" : "invalid_request")
      }

      const result = acceptTiptapProposal(editor, capture, {
        proposal: getReviewedProposal(proposal),
        preparation,
        confirmDocumentReplacement:
          acceptOptions?.confirmDocumentReplacement === true,
      })
      if (result.ok) {
        activeCapture = null
        preparedProposal = null
        sourceProposal = null
      }
      return result
    },

    reject(proposalId) {
      if (destroyed) return failure("editor_not_configured")

      const result = clearTiptapProposal(editor, proposalId)
      if (result.ok) {
        activeCapture = null
        preparedProposal = null
        sourceProposal = null
      }
      return result
    },

    getEditorState() {
      return destroyed ? null : getEmendAiEditorState(editor)
    },

    destroy() {
      if (destroyed) return

      if (!editor.isDestroyed) {
        clearTiptapProposal(editor)
      }
      activeCapture = null
      preparedProposal = null
      sourceProposal = null
      destroyed = true
    },
  }

  return adapter

  function getReviewedProposal(proposal: EmendProposal): EmendProposal {
    return preparedProposal &&
      sourceProposal &&
      sourceProposal.id === proposal.id &&
      sourceProposal.actionId === proposal.actionId &&
      sourceProposal.content.value === proposal.content.value &&
      sourceProposal.userModified === proposal.userModified
      ? preparedProposal
      : proposal
  }
}

function createReviewedProposal(
  proposal: EmendProposal,
  editedMarkdown?: string
): EmendProposal {
  return editedMarkdown === undefined
    ? proposal
    : createProposal({
        id: proposal.id,
        actionId: proposal.actionId,
        request: proposal.request,
        content: { format: "markdown", value: editedMarkdown },
        userModified: true,
      })
}

function blockedPreparation(
  proposal: EmendProposal,
  rawMarkdown: string,
  userModified: boolean,
  code: "editor_not_configured" | "invalid_request"
): EmendTiptapPreparation {
  return Object.freeze({
    kind: "blocked",
    proposalId: proposal.id,
    actionId: proposal.actionId,
    rawMarkdown,
    warnings: [],
    error: Object.freeze(createEmendError(code)),
    userModified,
  })
}

function failure(code: "editor_not_configured" | "invalid_request") {
  return {
    ok: false as const,
    error: Object.freeze(createEmendError(code)),
  }
}
