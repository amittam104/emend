export type EmendErrorCode =
  | "invalid_protocol"
  | "invalid_request"
  | "invalid_action"
  | "invalid_instruction"
  | "context_too_large"
  | "selection_required"
  | "pending_review"
  | "request_in_progress"
  | "stale_revision"
  | "aborted"
  | "transport_error"
  | "provider_error"
  | "unauthorized"
  | "rate_limited"
  | "schema_unsupported"
  | "apply_failed"
  | "internal_error"

export interface EmendAiError {
  readonly code: EmendErrorCode
  readonly message: string
  readonly retryable: boolean
}

const errorDefaults: Record<
  EmendErrorCode,
  { message: string; retryable: boolean }
> = {
  invalid_protocol: {
    message: "This request uses an unsupported Emend protocol version.",
    retryable: false,
  },
  invalid_request: { message: "The AI request is invalid.", retryable: false },
  invalid_action: {
    message: "That AI action is not available.",
    retryable: false,
  },
  invalid_instruction: {
    message: "Add a valid instruction and try again.",
    retryable: false,
  },
  context_too_large: {
    message: "The selected context is too large for this request.",
    retryable: false,
  },
  selection_required: {
    message: "Select some text before using this action.",
    retryable: false,
  },
  pending_review: {
    message: "Review or reject the pending document change first.",
    retryable: false,
  },
  request_in_progress: {
    message: "Another AI request is already in progress.",
    retryable: false,
  },
  stale_revision: {
    message:
      "The document changed while this request was open. Run the action again.",
    retryable: false,
  },
  aborted: { message: "The AI request was cancelled.", retryable: true },
  transport_error: {
    message: "The AI service could not be reached.",
    retryable: true,
  },
  provider_error: {
    message: "The configured AI provider returned an error.",
    retryable: true,
  },
  unauthorized: {
    message: "This request is not authorized.",
    retryable: false,
  },
  rate_limited: {
    message: "Too many requests. Try again shortly.",
    retryable: true,
  },
  schema_unsupported: {
    message: "The editor cannot safely accept this generated content.",
    retryable: false,
  },
  apply_failed: {
    message: "The proposal could not be applied safely.",
    retryable: false,
  },
  internal_error: {
    message: "The request failed unexpectedly.",
    retryable: true,
  },
}

export function createEmendError(
  code: EmendErrorCode,
  message = errorDefaults[code].message
): EmendAiError {
  return { code, message, retryable: errorDefaults[code].retryable }
}

export function isEmendErrorCode(value: unknown): value is EmendErrorCode {
  return typeof value === "string" && Object.hasOwn(errorDefaults, value)
}

export function publicError(
  error: unknown,
  fallbackCode: "internal_error" | "provider_error" = "internal_error"
): EmendAiError {
  const code = getErrorCode(error)
  return createEmendError(isEmendErrorCode(code) ? code : fallbackCode)
}

function getErrorCode(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined

  const value = error as {
    readonly code?: unknown
    readonly emendCode?: unknown
  }
  return value.emendCode ?? value.code
}
