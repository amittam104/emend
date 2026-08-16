import type { JSONContent } from "@tiptap/core"
import type {
  Fragment,
  Mark,
  Node as ProseMirrorNode,
  ResolvedPos,
  Slice,
} from "@tiptap/pm/model"
import type { EmendMarkdownWarning } from "../content/types.js"
import type { EmendProposal } from "../proposal/index.js"
import type { EmendAiError } from "../protocol/errors.js"
import type {
  EmendActionId,
  EmendCaptureOptions,
  EmendCaptureResult,
  EmendMutationOperation,
  EmendRequestLimits,
  EmendSelectionRange,
  EmendSourceRevision,
} from "../protocol/index.js"

export type EmendTiptapPreviewKind =
  | "supported-markdown"
  | "plain-text-fallback"

export interface EmendCapturedRange extends EmendSelectionRange {
  readonly fromResolved: ResolvedPos
  readonly toResolved: ResolvedPos
}

export interface EmendCapturedContent {
  readonly range: EmendCapturedRange
  readonly slice: Slice
  readonly json: JSONContent
}

export interface EmendCapturedTarget extends EmendCapturedContent {
  readonly mutationOperation: Exclude<EmendMutationOperation, null>
  readonly parentNodeType: string
  readonly parentAttributes: Readonly<Record<string, unknown>>
  readonly sourceNode: ProseMirrorNode | null
  readonly sourceMarks: readonly Mark[]
  readonly placement: "inline" | "block"
  readonly textSafe: boolean
}

export type EmendTiptapCaptureResult =
  | { readonly ok: true; readonly capture: EmendTiptapCapture }
  | { readonly ok: false; readonly error: EmendAiError }

export interface EmendTiptapCapture {
  readonly protocol: EmendCaptureResult
  readonly target: EmendCapturedTarget | null
  readonly context: EmendCapturedContent
  readonly warnings: readonly EmendMarkdownWarning[]
}

export interface EmendTiptapCaptureOptions extends EmendCaptureOptions {
  readonly limits?: Partial<
    Pick<
      EmendRequestLimits,
      "maxTargetMarkdownLength" | "maxContextMarkdownLength"
    >
  >
  readonly linkProtocols?: readonly string[]
  readonly contextProjection?: string
}

interface EmendTiptapPreparationBase {
  readonly proposalId: string
  readonly actionId: EmendActionId
  readonly targetRange: EmendSelectionRange
  readonly sourceRevision: EmendSourceRevision
  readonly normalizedMarkdown: string
  readonly slice: Slice
  readonly preview: Fragment
  readonly warnings: readonly EmendMarkdownWarning[]
  readonly requiresDocumentConfirmation: boolean
  readonly userModified: boolean
}

export interface EmendSupportedTiptapPreparation extends EmendTiptapPreparationBase {
  readonly kind: "supported-markdown"
}

export interface EmendPlainTextTiptapPreparation extends EmendTiptapPreparationBase {
  readonly kind: "plain-text-fallback"
  readonly text: string
}

export interface EmendBlockedTiptapPreparation {
  readonly kind: "blocked"
  readonly proposalId: string
  readonly actionId: EmendActionId
  readonly rawMarkdown: string
  readonly normalizedMarkdown?: string
  readonly warnings: readonly EmendMarkdownWarning[]
  readonly error: EmendAiError
  readonly userModified: boolean
}

export type EmendTiptapPreparation =
  | EmendSupportedTiptapPreparation
  | EmendPlainTextTiptapPreparation
  | EmendBlockedTiptapPreparation

export type EmendTiptapApplyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: EmendAiError }

export interface EmendTiptapApplyOptions {
  readonly preparation: EmendTiptapPreparation
  readonly proposal: EmendProposal
  readonly confirmDocumentReplacement: boolean
}

export interface EmendTiptapEditorState {
  readonly revisionCounter: number
  readonly activeProposalId: string | null
  readonly targetRange: EmendSelectionRange | null
  readonly sourceRevision: EmendSourceRevision | null
  readonly stale: boolean
  readonly previewKind: EmendTiptapPreviewKind | null
}

export interface EmendTiptapShowProposalOptions {
  readonly proposalId: string
  readonly targetRange: EmendSelectionRange
  readonly sourceRevision: EmendSourceRevision
  readonly previewKind?: EmendTiptapPreviewKind | null
}

export interface EmendTiptapClearProposalOptions {
  readonly proposalId?: string
}

export type EmendTiptapSourceRevisionResult =
  | { readonly ok: true; readonly revision: EmendSourceRevision }
  | { readonly ok: false; readonly error: EmendAiError }
