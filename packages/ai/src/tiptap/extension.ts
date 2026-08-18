import { Extension, type CommandProps, type Editor } from "@tiptap/core"
import { Fragment } from "@tiptap/pm/model"
import { Plugin } from "@tiptap/pm/state"
import { DecorationSet } from "@tiptap/pm/view"
import type {
  EmendTiptapClearProposalOptions,
  EmendTiptapEditorState,
  EmendTiptapShowProposalOptions,
} from "./types.js"
import {
  getEmendAiPluginKey,
  getEmendAiPluginState,
  getInternalEmendAiPluginState,
  isTiptapSourceRevisionCurrent,
  toEmendAiEditorState,
  type EmendAiPluginState,
} from "./revision.js"
import { createTiptapProposalDecorations } from "./decorations.js"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emendAi: {
      showEmendProposal: (options: EmendTiptapShowProposalOptions) => ReturnType
      clearEmendProposal: (
        options?: EmendTiptapClearProposalOptions
      ) => ReturnType
    }
  }
}

type EmendAiLifecycleMeta =
  | {
      readonly type: "show"
      readonly options: EmendTiptapShowProposalOptions
    }
  | {
      readonly type: "clear"
      readonly proposalId?: string
    }
  | {
      readonly type: "accept"
      readonly proposalId: string
    }

const emendAiPluginKey = getEmendAiPluginKey()

export const EmendAi = Extension.create({
  name: "emendAi",

  addProseMirrorPlugins() {
    return [
      new Plugin<EmendAiPluginState>({
        key: emendAiPluginKey,
        state: {
          init: () => createInitialState(),
          apply(transaction, previous, _oldState, newState) {
            let next: EmendAiPluginState = transaction.docChanged
              ? {
                  ...previous,
                  revisionCounter: previous.revisionCounter + 1,
                }
              : previous
            const meta = readLifecycleMeta(
              transaction.getMeta(emendAiPluginKey)
            )

            if (
              meta?.type === "accept" &&
              meta.proposalId === next.activeProposalId
            ) {
              return clearPluginState(next)
            }

            if (transaction.docChanged && next.activeProposalId) {
              next = {
                ...next,
                stale: true,
                decorations: DecorationSet.empty,
              }
            }

            if (!meta) return next
            if (meta.type === "show") {
              if (
                !isValidShowOptions(meta.options, newState.doc.content.size) ||
                (next.activeProposalId !== null &&
                  next.activeProposalId !== meta.options.proposalId)
              ) {
                return next
              }

              return {
                ...next,
                activeProposalId: meta.options.proposalId,
                targetRange: Object.freeze({ ...meta.options.targetRange }),
                sourceRevision: Object.freeze({
                  ...meta.options.sourceRevision,
                }),
                stale: false,
                previewKind: meta.options.preview
                  ? (meta.options.previewKind ?? null)
                  : null,
                decorations: createTiptapProposalDecorations(
                  newState.doc,
                  meta.options
                ),
              }
            }

            if (
              meta.proposalId !== undefined &&
              meta.proposalId !== next.activeProposalId
            ) {
              return next
            }

            return clearPluginState(next)
          },
        },
        props: {
          decorations: (state) =>
            emendAiPluginKey.getState(state)?.decorations ??
            DecorationSet.empty,
        },
      }),
    ]
  },

  addCommands() {
    const editor = this.editor

    return {
      showEmendProposal:
        (options: EmendTiptapShowProposalOptions) =>
        ({ state, tr, dispatch }: CommandProps) => {
          const pluginState = getEmendAiPluginState(state)
          if (
            !pluginState ||
            !isValidShowOptions(options, state.doc.content.size) ||
            (pluginState.activeProposalId !== null &&
              pluginState.activeProposalId !== options.proposalId) ||
            !isTiptapSourceRevisionCurrent(editor, options.sourceRevision)
          ) {
            return false
          }

          if (dispatch) {
            dispatch(
              tr
                .setMeta(emendAiPluginKey, { type: "show", options })
                .setMeta("addToHistory", false)
            )
          }
          return true
        },
      clearEmendProposal:
        (options?: EmendTiptapClearProposalOptions) =>
        ({ state, tr, dispatch }: CommandProps) => {
          const pluginState = getEmendAiPluginState(state)
          if (!pluginState) return false

          const proposalId = options?.proposalId
          if (
            proposalId !== undefined &&
            (typeof proposalId !== "string" ||
              (pluginState.activeProposalId !== null &&
                pluginState.activeProposalId !== proposalId))
          ) {
            return false
          }

          if (dispatch) {
            dispatch(
              tr
                .setMeta(emendAiPluginKey, { type: "clear", proposalId })
                .setMeta("addToHistory", false)
            )
          }
          return true
        },
    }
  },
})

export function getEmendAiEditorState(
  editor: Editor | null | undefined
): EmendTiptapEditorState | null {
  const pluginState = getInternalEmendAiPluginState(editor)
  return pluginState ? toEmendAiEditorState(pluginState) : null
}

function createInitialState(): EmendAiPluginState {
  return {
    revisionCounter: 0,
    activeProposalId: null,
    targetRange: null,
    sourceRevision: null,
    stale: false,
    previewKind: null,
    decorations: DecorationSet.empty,
  }
}

function clearPluginState(state: EmendAiPluginState): EmendAiPluginState {
  return {
    ...state,
    activeProposalId: null,
    targetRange: null,
    sourceRevision: null,
    stale: false,
    previewKind: null,
    decorations: DecorationSet.empty,
  }
}

function readLifecycleMeta(value: unknown): EmendAiLifecycleMeta | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined

  if (value.type === "show" && isValidShowOptionsValue(value.options)) {
    return { type: "show", options: value.options }
  }

  if (value.type === "clear") {
    return typeof value.proposalId === "undefined" ||
      typeof value.proposalId === "string"
      ? {
          type: "clear",
          ...(value.proposalId !== undefined
            ? { proposalId: value.proposalId }
            : {}),
        }
      : undefined
  }

  if (value.type === "accept" && typeof value.proposalId === "string") {
    return { type: "accept", proposalId: value.proposalId }
  }

  return undefined
}

function isValidShowOptions(
  value: unknown,
  documentSize: number
): value is EmendTiptapShowProposalOptions {
  return (
    isValidShowOptionsValue(value) &&
    value.targetRange.from <= documentSize &&
    value.targetRange.to <= documentSize
  )
}

function isValidShowOptionsValue(
  value: unknown
): value is EmendTiptapShowProposalOptions {
  if (!isRecord(value) || typeof value.proposalId !== "string") return false
  if (!value.proposalId.trim()) return false
  if (!isValidRange(value.targetRange)) return false
  if (!isValidSourceRevision(value.sourceRevision)) return false
  if (value.preview !== undefined && !(value.preview instanceof Fragment)) {
    return false
  }
  if (
    value.preview !== undefined &&
    (value.previewKind === undefined ||
      value.previewKind === null ||
      value.previewPlacement === undefined)
  ) {
    return false
  }

  return (
    (value.previewKind === undefined ||
      value.previewKind === null ||
      value.previewKind === "supported-markdown" ||
      value.previewKind === "plain-text-fallback") &&
    (value.previewPlacement === undefined ||
      value.previewPlacement === "inline" ||
      value.previewPlacement === "block")
  )
}

function isValidRange(value: unknown): value is { from: number; to: number } {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.from) &&
    isNonNegativeInteger(value.to) &&
    value.from <= value.to
  )
}

function isValidSourceRevision(value: unknown): value is {
  counter: number
  fingerprint: string
} {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.counter) &&
    typeof value.fingerprint === "string" &&
    value.fingerprint.length > 0
  )
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
