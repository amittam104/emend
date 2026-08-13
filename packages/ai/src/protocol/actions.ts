import type {
  EmendActionId,
  EmendAiRequest,
  EmendContextScope,
  EmendInteractionMode,
  EmendMutationOperation,
  EmendTargetScope,
} from "./types.js"

export type EmendSelectionRequirement = "any" | "non-empty" | "collapsed"

export type EmendInstructionRequirement = "optional" | "required"

export interface EmendActionManifestEntry {
  readonly actionId: EmendActionId
  readonly label: string
  readonly description: string
  readonly allowedInteractionModes: readonly EmendInteractionMode[]
  readonly allowedTargetScopes: readonly EmendTargetScope[]
  readonly allowedContextScopes: readonly EmendContextScope[]
  readonly allowedMutationOperations: readonly EmendMutationOperation[]
  readonly selectionRequirement: EmendSelectionRequirement
  readonly instructionRequirement: EmendInstructionRequirement
  readonly informational: boolean
}

export type EmendActionValidationInput = Pick<
  EmendAiRequest,
  | "actionId"
  | "interactionMode"
  | "targetScope"
  | "contextScope"
  | "mutationOperation"
  | "targetRange"
  | "instruction"
>

export type EmendActionValidationReason =
  | "unknown-action"
  | "interaction-mode-not-allowed"
  | "target-scope-not-allowed"
  | "context-scope-not-allowed"
  | "mutation-operation-not-allowed"
  | "selection-requirement-not-met"
  | "instruction-required"

export type EmendActionValidation =
  | { readonly ok: true; readonly action: EmendActionManifestEntry }
  | { readonly ok: false; readonly reason: EmendActionValidationReason }

const allScopes = ["selection", "current-block", "document"] as const

const allMutationOperations = [
  "replace-selection",
  "replace-current-block",
  "replace-document",
  "insert-at-cursor",
] as const

export const DEFAULT_ACTION_MANIFEST: readonly EmendActionManifestEntry[] = [
  {
    actionId: "improve",
    label: "Improve",
    description: "Make the selected writing clearer.",
    allowedInteractionModes: ["edit"],
    allowedTargetScopes: ["selection"],
    allowedContextScopes: allScopes,
    allowedMutationOperations: ["replace-selection"],
    selectionRequirement: "non-empty",
    instructionRequirement: "optional",
    informational: false,
  },
  {
    actionId: "shorten",
    label: "Shorten",
    description: "Make the selected writing more concise.",
    allowedInteractionModes: ["edit"],
    allowedTargetScopes: ["selection"],
    allowedContextScopes: allScopes,
    allowedMutationOperations: ["replace-selection"],
    selectionRequirement: "non-empty",
    instructionRequirement: "optional",
    informational: false,
  },
  {
    actionId: "expand",
    label: "Expand",
    description: "Add useful detail to the selected writing.",
    allowedInteractionModes: ["edit"],
    allowedTargetScopes: ["selection"],
    allowedContextScopes: allScopes,
    allowedMutationOperations: ["replace-selection"],
    selectionRequirement: "non-empty",
    instructionRequirement: "optional",
    informational: false,
  },
  {
    actionId: "fix-grammar",
    label: "Fix grammar",
    description: "Correct grammar and spelling.",
    allowedInteractionModes: ["edit"],
    allowedTargetScopes: ["selection"],
    allowedContextScopes: allScopes,
    allowedMutationOperations: ["replace-selection"],
    selectionRequirement: "non-empty",
    instructionRequirement: "optional",
    informational: false,
  },
  {
    actionId: "continue",
    label: "Continue",
    description: "Continue writing from the current cursor.",
    allowedInteractionModes: ["edit"],
    allowedTargetScopes: ["selection"],
    allowedContextScopes: allScopes,
    allowedMutationOperations: ["insert-at-cursor"],
    selectionRequirement: "collapsed",
    instructionRequirement: "optional",
    informational: false,
  },
  {
    actionId: "summarize",
    label: "Summarize",
    description: "Return a summary without changing the document.",
    allowedInteractionModes: ["ask"],
    allowedTargetScopes: allScopes,
    allowedContextScopes: allScopes,
    allowedMutationOperations: [],
    selectionRequirement: "any",
    instructionRequirement: "optional",
    informational: true,
  },
  {
    actionId: "custom",
    label: "Custom",
    description: "Run a user-provided instruction.",
    allowedInteractionModes: ["ask", "edit"],
    allowedTargetScopes: allScopes,
    allowedContextScopes: allScopes,
    allowedMutationOperations: allMutationOperations,
    selectionRequirement: "any",
    instructionRequirement: "required",
    informational: false,
  },
]

export function getAction(
  actionId: EmendActionId,
  manifest: readonly EmendActionManifestEntry[] = DEFAULT_ACTION_MANIFEST
): EmendActionManifestEntry | undefined {
  return manifest.find((action) => action.actionId === actionId)
}

export function validateAction(
  input: EmendActionValidationInput,
  manifest: readonly EmendActionManifestEntry[] = DEFAULT_ACTION_MANIFEST
): EmendActionValidation {
  const action = getAction(input.actionId, manifest)

  if (!action) return { ok: false, reason: "unknown-action" }
  if (
    !action.allowedInteractionModes.includes(input.interactionMode) ||
    (action.informational && input.interactionMode !== "ask")
  ) {
    return { ok: false, reason: "interaction-mode-not-allowed" }
  }
  if (!action.allowedTargetScopes.includes(input.targetScope)) {
    return { ok: false, reason: "target-scope-not-allowed" }
  }
  if (!action.allowedContextScopes.includes(input.contextScope)) {
    return { ok: false, reason: "context-scope-not-allowed" }
  }
  if (
    action.instructionRequirement === "required" &&
    !input.instruction?.trim()
  ) {
    return { ok: false, reason: "instruction-required" }
  }

  if (input.interactionMode === "ask") {
    return input.mutationOperation === null && input.targetRange === null
      ? { ok: true, action }
      : { ok: false, reason: "mutation-operation-not-allowed" }
  }

  if (
    input.mutationOperation === null ||
    !action.allowedMutationOperations.includes(input.mutationOperation)
  ) {
    return { ok: false, reason: "mutation-operation-not-allowed" }
  }

  const collapsed = input.targetRange?.from === input.targetRange?.to

  if (
    (action.selectionRequirement === "non-empty" &&
      (input.targetRange === null || collapsed)) ||
    (action.selectionRequirement === "collapsed" &&
      (input.targetRange === null || !collapsed))
  ) {
    return { ok: false, reason: "selection-requirement-not-met" }
  }

  if (!hasValidMutationTarget(input)) {
    return { ok: false, reason: "mutation-operation-not-allowed" }
  }

  return { ok: true, action }
}

export function isInformationalAction(
  actionId: EmendActionId,
  interactionMode: EmendInteractionMode,
  manifest: readonly EmendActionManifestEntry[] = DEFAULT_ACTION_MANIFEST
): boolean {
  const action = getAction(actionId, manifest)
  return (
    action !== undefined &&
    action.allowedInteractionModes.includes(interactionMode) &&
    (action.informational || interactionMode === "ask")
  )
}

function hasValidMutationTarget(input: EmendActionValidationInput): boolean {
  if (!input.targetRange) return false

  switch (input.mutationOperation) {
    case "replace-selection":
      return (
        input.targetScope === "selection" &&
        input.targetRange.from < input.targetRange.to
      )
    case "insert-at-cursor":
      return (
        input.targetScope === "selection" &&
        input.targetRange.from === input.targetRange.to
      )
    case "replace-current-block":
      return input.targetScope === "current-block"
    case "replace-document":
      return input.targetScope === "document"
    case null:
      return false
  }
}
