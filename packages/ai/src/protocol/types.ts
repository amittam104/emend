import type { EmendAiError } from "./errors.js"

export type { EmendAiError } from "./errors.js"

export const PROTOCOL_VERSION = 1 as const

export type EmendAiState =
  | "idle"
  | "submitting"
  | "streaming"
  | "reviewing"
  | "error"
  | "aborted"

export type EmendInteractionMode = "ask" | "edit"

export type EmendContextScope = "selection" | "current-block" | "document"

export type EmendTargetScope = "selection" | "current-block" | "document"

export type EmendMutationOperation =
  | "replace-selection"
  | "replace-current-block"
  | "replace-document"
  | "insert-at-cursor"

export type EmendBuiltInActionId =
  | "improve"
  | "shorten"
  | "expand"
  | "fix-grammar"
  | "continue"
  | "summarize"

export type EmendActionId = EmendBuiltInActionId | "custom" | (string & {})

export interface EmendSelectionRange {
  readonly from: number
  readonly to: number
}

export interface EmendSourceRevision {
  readonly counter: number
  readonly fingerprint: string
}

export interface EmendSchemaCapabilities {
  readonly nodes: readonly string[]
  readonly marks: readonly string[]
  readonly markdown: boolean
}

export interface EmendCaptureResult {
  readonly targetRange: EmendSelectionRange | null
  readonly targetScope: EmendTargetScope
  readonly contextScope: EmendContextScope
  readonly mutationOperation: EmendMutationOperation | null
  readonly targetMarkdown: string
  readonly contextMarkdown: string
  readonly sourceRevision: EmendSourceRevision
  readonly schemaCapabilities: EmendSchemaCapabilities
}

export interface EmendAiRequest {
  readonly protocolVersion: typeof PROTOCOL_VERSION
  readonly requestId: string
  readonly actionId: EmendActionId
  readonly interactionMode: EmendInteractionMode
  readonly targetScope: EmendTargetScope
  readonly contextScope: EmendContextScope
  readonly mutationOperation: EmendMutationOperation | null
  readonly targetRange: EmendSelectionRange | null
  readonly targetMarkdown: string
  readonly contextMarkdown: string
  readonly instruction?: string
  readonly sourceRevision: EmendSourceRevision
  readonly schemaCapabilities: EmendSchemaCapabilities
}

export interface EmendRequestLimits {
  readonly maxRequestIdLength: number
  readonly maxTargetMarkdownLength: number
  readonly maxContextMarkdownLength: number
  readonly maxInstructionLength: number
  readonly maxActionIdLength: number
  readonly maxCapabilityNameLength: number
}

export const DEFAULT_REQUEST_LIMITS: EmendRequestLimits = {
  maxRequestIdLength: 128,
  maxTargetMarkdownLength: 8_000,
  maxContextMarkdownLength: 12_000,
  maxInstructionLength: 1_000,
  maxActionIdLength: 100,
  maxCapabilityNameLength: 100,
}

export type EmendStreamEvent =
  | {
      readonly protocolVersion: typeof PROTOCOL_VERSION
      readonly type: "text-delta"
      readonly requestId: string
      readonly delta: string
    }
  | {
      readonly protocolVersion: typeof PROTOCOL_VERSION
      readonly type: "done"
      readonly requestId: string
    }
  | {
      readonly protocolVersion: typeof PROTOCOL_VERSION
      readonly type: "error"
      readonly requestId: string
      readonly error: EmendAiError
    }
