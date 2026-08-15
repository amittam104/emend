import {
  DEFAULT_ACTION_MANIFEST,
  type EmendActionManifestEntry,
  type EmendActionValidationReason,
  validateAction,
} from "./actions.js"
import {
  createEmendError,
  type EmendAiError,
  type EmendErrorCode,
} from "./errors.js"
import {
  DEFAULT_REQUEST_LIMITS,
  PROTOCOL_VERSION,
  type EmendAiRequest,
  type EmendRequestLimits,
  type EmendSchemaCapabilities,
  type EmendSelectionRange,
  type EmendSourceRevision,
} from "./types.js"

export interface ParseRequestOptions {
  readonly limits?: Partial<EmendRequestLimits>
  readonly manifest?: readonly EmendActionManifestEntry[]
}

export type RequestValidation =
  | { readonly ok: true; readonly request: EmendAiRequest }
  | { readonly ok: false; readonly error: EmendAiError }

const requestRequiredKeys = [
  "protocolVersion",
  "requestId",
  "actionId",
  "interactionMode",
  "targetScope",
  "contextScope",
  "mutationOperation",
  "targetRange",
  "targetMarkdown",
  "contextMarkdown",
  "sourceRevision",
  "schemaCapabilities",
] as const

const requestOptionalKeys = ["instruction"] as const

const interactionModes = ["ask", "edit"] as const
const contextScopes = ["selection", "current-block", "document"] as const
const targetScopes = ["selection", "current-block", "document"] as const
const mutationOperations = [
  "replace-selection",
  "replace-current-block",
  "replace-document",
  "insert-at-cursor",
] as const

export function parseRequest(
  input: unknown,
  options: ParseRequestOptions = {}
): RequestValidation {
  const limits = resolveLimits(options.limits)
  if (!limits || !isRecord(input)) return invalid("invalid_request")

  if (input.protocolVersion !== PROTOCOL_VERSION) {
    return invalid("invalid_protocol")
  }

  if (!hasExactKeys(input, requestRequiredKeys, requestOptionalKeys)) {
    return invalid("invalid_request")
  }

  if (!isNonEmptyBoundedString(input.requestId, limits.maxRequestIdLength)) {
    return invalid("invalid_request")
  }

  if (!isNonEmptyBoundedString(input.actionId, limits.maxActionIdLength)) {
    return invalid("invalid_action")
  }

  if (!isOneOf(input.interactionMode, interactionModes)) {
    return invalid("invalid_request")
  }

  if (!isOneOf(input.targetScope, targetScopes)) {
    return invalid("invalid_request")
  }

  if (!isOneOf(input.contextScope, contextScopes)) {
    return invalid("invalid_request")
  }

  if (!isNullableOneOf(input.mutationOperation, mutationOperations)) {
    return invalid("invalid_request")
  }

  if (!isNullableSelectionRange(input.targetRange)) {
    return invalid("invalid_request")
  }

  if (typeof input.targetMarkdown !== "string") {
    return invalid("invalid_request")
  }
  if (input.targetMarkdown.length > limits.maxTargetMarkdownLength) {
    return invalid("context_too_large")
  }

  if (typeof input.contextMarkdown !== "string") {
    return invalid("invalid_request")
  }
  if (input.contextMarkdown.length > limits.maxContextMarkdownLength) {
    return invalid("context_too_large")
  }

  const hasInstruction = Object.hasOwn(input, "instruction")
  const instruction = input.instruction
  if (hasInstruction) {
    if (typeof instruction !== "string") return invalid("invalid_instruction")
    if (instruction.length > limits.maxInstructionLength) {
      return invalid("invalid_instruction")
    }
  }

  if (!isSourceRevision(input.sourceRevision)) {
    return invalid("invalid_request")
  }

  if (!isSchemaCapabilities(input.schemaCapabilities, limits)) {
    return invalid("invalid_request")
  }

  const request = {
    protocolVersion: PROTOCOL_VERSION,
    requestId: input.requestId,
    actionId: input.actionId,
    interactionMode: input.interactionMode,
    targetScope: input.targetScope,
    contextScope: input.contextScope,
    mutationOperation: input.mutationOperation,
    targetRange: input.targetRange,
    targetMarkdown: input.targetMarkdown,
    contextMarkdown: input.contextMarkdown,
    ...(hasInstruction ? { instruction: instruction as string } : {}),
    sourceRevision: input.sourceRevision,
    schemaCapabilities: input.schemaCapabilities,
  }

  const actionValidation = validateAction(
    {
      actionId: request.actionId,
      interactionMode: request.interactionMode,
      targetScope: request.targetScope,
      contextScope: request.contextScope,
      mutationOperation: request.mutationOperation,
      targetRange: request.targetRange,
      instruction: request.instruction,
    },
    options.manifest ?? DEFAULT_ACTION_MANIFEST
  )

  if (!actionValidation.ok) {
    return invalid(actionValidationError(actionValidation.reason))
  }

  if (
    actionValidation.action.selectionRequirement === "non-empty" &&
    !request.targetMarkdown.trim()
  ) {
    return invalid("selection_required")
  }

  return { ok: true, request }
}

function invalid(code: EmendErrorCode): RequestValidation {
  return { ok: false, error: createEmendError(code) }
}

function actionValidationError(
  reason: EmendActionValidationReason
): EmendErrorCode {
  switch (reason) {
    case "instruction-required":
      return "invalid_instruction"
    case "selection-requirement-not-met":
      return "selection_required"
    case "unknown-action":
    case "interaction-mode-not-allowed":
    case "target-scope-not-allowed":
    case "context-scope-not-allowed":
    case "mutation-operation-not-allowed":
      return "invalid_action"
  }
}

function resolveLimits(
  configured: Partial<EmendRequestLimits> | undefined
): EmendRequestLimits | null {
  const limits = { ...DEFAULT_REQUEST_LIMITS, ...configured }
  return Object.values(limits).every(isNonNegativeInteger) ? limits : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
): boolean {
  const allowed = new Set([...required, ...optional])
  return (
    Reflect.ownKeys(value).every(
      (key) => typeof key === "string" && allowed.has(key)
    ) && required.every((key) => Object.hasOwn(value, key))
  )
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T)
}

function isNullableOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T | null {
  return value === null || isOneOf(value, allowed)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isNonEmptyBoundedString(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

function isNullableSelectionRange(
  value: unknown
): value is EmendSelectionRange | null {
  if (value === null) return true
  if (!isRecord(value) || !hasExactKeys(value, ["from", "to"])) return false

  return (
    isNonNegativeInteger(value.from) &&
    isNonNegativeInteger(value.to) &&
    value.from <= value.to
  )
}

function isSourceRevision(value: unknown): value is EmendSourceRevision {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["counter", "fingerprint"]) &&
    isNonNegativeInteger(value.counter) &&
    typeof value.fingerprint === "string" &&
    value.fingerprint.trim().length > 0
  )
}

function isSchemaCapabilities(
  value: unknown,
  limits: EmendRequestLimits
): value is EmendSchemaCapabilities {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["nodes", "marks", "markdown"]) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.marks) ||
    typeof value.markdown !== "boolean"
  ) {
    return false
  }

  return [value.nodes, value.marks].every((names) =>
    names.every(
      (name) =>
        typeof name === "string" &&
        name.trim().length > 0 &&
        name.length <= limits.maxCapabilityNameLength
    )
  )
}
