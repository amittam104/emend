import type { EmendAiState } from "./types.js"

const transitions: Readonly<Record<EmendAiState, readonly EmendAiState[]>> = {
  idle: ["submitting"],
  submitting: ["streaming", "reviewing", "error", "aborted"],
  streaming: ["reviewing", "error", "aborted"],
  reviewing: ["idle", "submitting", "error"],
  error: ["submitting", "idle", "reviewing"],
  aborted: ["submitting", "idle", "reviewing"],
}

export function canTransition(from: EmendAiState, to: EmendAiState): boolean {
  return transitions[from].includes(to)
}
