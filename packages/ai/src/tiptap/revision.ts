import type { Editor } from "@tiptap/core"
import { PluginKey, type EditorState } from "@tiptap/pm/state"
import { DecorationSet } from "@tiptap/pm/view"
import { createEmendError } from "../protocol/errors.js"
import type {
  EmendSelectionRange,
  EmendSourceRevision,
} from "../protocol/types.js"
import type {
  EmendTiptapEditorState,
  EmendTiptapPreviewKind,
  EmendTiptapSourceRevisionResult,
} from "./types.js"

export interface EmendAiPluginState {
  readonly revisionCounter: number
  readonly activeProposalId: string | null
  readonly targetRange: EmendSelectionRange | null
  readonly sourceRevision: EmendSourceRevision | null
  readonly stale: boolean
  readonly previewKind: EmendTiptapPreviewKind | null
  readonly decorations: DecorationSet
}

const emendAiPluginKey = new PluginKey<EmendAiPluginState>("emendAi")

export function getEmendAiPluginKey(): PluginKey<EmendAiPluginState> {
  return emendAiPluginKey
}

export function getEmendAiPluginState(
  state: EditorState
): EmendAiPluginState | undefined {
  return emendAiPluginKey.getState(state)
}

export function getInternalEmendAiPluginState(
  editor: Editor | null | undefined
): EmendAiPluginState | undefined {
  if (!editor || editor.isDestroyed) return undefined
  return getEmendAiPluginState(editor.state)
}

export function getTiptapSourceRevision(
  editor: Editor | null | undefined
): EmendTiptapSourceRevisionResult {
  const pluginState = getInternalEmendAiPluginState(editor)
  if (!pluginState || !editor) {
    return {
      ok: false,
      error: createEmendError("editor_not_configured"),
    }
  }

  try {
    const serialized = JSON.stringify(editor.getJSON())
    return {
      ok: true,
      revision: Object.freeze({
        counter: pluginState.revisionCounter,
        fingerprint: fingerprint(serialized),
      }),
    }
  } catch {
    return {
      ok: false,
      error: createEmendError("internal_error"),
    }
  }
}

export function isTiptapSourceRevisionCurrent(
  editor: Editor | null | undefined,
  revision: EmendSourceRevision
): boolean {
  const current = getTiptapSourceRevision(editor)
  return current.ok && sameTiptapSourceRevision(current.revision, revision)
}

export function sameTiptapSourceRevision(
  left: EmendSourceRevision,
  right: EmendSourceRevision
): boolean {
  return (
    left.counter === right.counter && left.fingerprint === right.fingerprint
  )
}

export function toEmendAiEditorState(
  state: EmendAiPluginState
): EmendTiptapEditorState {
  return Object.freeze({
    revisionCounter: state.revisionCounter,
    activeProposalId: state.activeProposalId,
    targetRange: state.targetRange
      ? Object.freeze({ ...state.targetRange })
      : null,
    sourceRevision: state.sourceRevision
      ? Object.freeze({ ...state.sourceRevision })
      : null,
    stale: state.stale,
    previewKind: state.previewKind,
  })
}

function fingerprint(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `v1:${value.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`
}
